import express from 'express';
import { Op } from 'sequelize';
import Quotation from '../models/quotation.js';
import Enquiry from '../models/enquiry.js';
import CustomerMaster from '../models/customerMaster.js';
import Company from '../models/company.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { sendEmail } from '../utils/emailService.js';

const router = express.Router();

// Helper: generate next quotation code
const generateQuotationCode = async (companyId, parentId = null) => {
  const year = new Date().getFullYear();
  
  if (parentId) {
    // Find parent to get base number
    const parent = await Quotation.findOne({ where: { id: parentId, CompanyId: companyId } });
    if (parent) {
      const revisionsCount = await Quotation.count({ 
        where: { 
          [Op.or]: [
            { id: parentId },
            { parentQuotationId: parentId }
          ],
          CompanyId: companyId 
        } 
      });
      const baseNum = parent.quotationNumber.split('-R')[0];
      return `${baseNum}-R${revisionsCount}`;
    }
  }

  const count = await Quotation.count({ 
    where: { 
      CompanyId: companyId,
      parentQuotationId: null // only count base quotations
    } 
  });
  const nextNum = String(count + 1).padStart(4, '0');
  return `QTN-${year}-${nextNum}`;
};

// GET /api/quotations — list all
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { search } = req.query;
    const whereClause = { 
      CompanyId: req.user.CompanyId
    };

    if (search) {
      whereClause[Op.or] = [
        { quotationNumber: { [Op.like]: `%${search}%` } },
        { clientName: { [Op.like]: `%${search}%` } },
        { '$Customer.customerName$': { [Op.like]: `%${search}%` } }
      ];
    }

    const quotations = await Quotation.findAll({ 
      where: whereClause,
      include: [
        { 
          model: CustomerMaster, 
          as: 'Customer', 
          attributes: ['id', 'customerName', ['mobileNumber', 'mobile'], 'email'] 
        },
        { model: Enquiry, attributes: ['id', 'enquiryNumber'] }
      ],
      order: [['createdAt', 'DESC']]
    });
    res.json(quotations);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch quotations' });
  }
});

// GET /api/quotations/:id — single quotation
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const quotation = await Quotation.findOne({
      where: { id: req.params.id, CompanyId: req.user.CompanyId },
      include: [
        { 
          model: CustomerMaster, 
          as: 'Customer', 
          attributes: [
            'id', 
            'customerName', 
            ['mobileNumber', 'mobile'], 
            'email', 
            ['billingAddress', 'address'], 
            ['gstNumber', 'gstNo']
          ] 
        },
        { model: Enquiry, attributes: ['id', 'enquiryNumber', 'details'] },
        { 
          model: Quotation, 
          as: 'Revisions',
          include: [{ model: CustomerMaster, as: 'Customer', attributes: ['customerName'] }]
        },
        { model: Quotation, as: 'ParentQuotation' }
      ]
    });
    if (!quotation) return res.status(404).json({ error: 'Quotation not found' });
    res.json(quotation);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch quotation details' });
  }
});

// POST /api/quotations — create base quotation
router.post('/', authenticateToken, requireRole(['Admin', 'SalesExecutive']), async (req, res) => {
  try {
    const { 
      quotationNumber,
      date, CustomerMasterId, clientName, totalAmount, validityDate, 
      termsConditions, remarks, items, EnquiryId, status, customFields 
    } = req.body;

    let code = quotationNumber;
    if (!code || code.trim() === '' || code.trim() === 'Auto Generated') {
      code = await generateQuotationCode(req.user.CompanyId);
    } else {
      code = code.trim();
    }

    const newQuotation = await Quotation.create({
      quotationNumber: code,
      date: date || new Date(),
      CustomerMasterId: CustomerMasterId || null,
      clientName: clientName || null,
      totalAmount: totalAmount || 0.00,
      validityDate: validityDate || null,
      termsConditions: termsConditions || null,
      remarks: remarks || null,
      items: items || [],
      customFields: customFields || null,
      revisionNumber: 0,
      parentQuotationId: null,
      status: status || 'Draft',
      EnquiryId: EnquiryId || null,
      CompanyId: req.user.CompanyId
    });

    if (EnquiryId) {
      await Enquiry.update({ status: 'Quotation Created' }, { where: { id: EnquiryId } });
    }

    res.status(201).json(newQuotation);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create quotation' });
  }
});

// POST /api/quotations/:id/revision — create a revision of an existing quotation
router.post('/:id/revision', authenticateToken, requireRole(['Admin', 'SalesExecutive']), async (req, res) => {
  try {
    const originalQuotation = await Quotation.findOne({
      where: { id: req.params.id, CompanyId: req.user.CompanyId }
    });

    if (!originalQuotation) {
      return res.status(404).json({ error: 'Original quotation not found.' });
    }

    const baseParentId = originalQuotation.parentQuotationId || originalQuotation.id;

    const code = await generateQuotationCode(req.user.CompanyId, baseParentId);
    
    const revCount = await Quotation.count({
      where: { parentQuotationId: baseParentId, CompanyId: req.user.CompanyId }
    });

    const { 
      date, totalAmount, validityDate, termsConditions, remarks, items, status 
    } = req.body;

    const newRevision = await Quotation.create({
      quotationNumber: code,
      date: date || new Date(),
      CustomerMasterId: originalQuotation.CustomerMasterId,
      clientName: originalQuotation.clientName,
      totalAmount: totalAmount !== undefined ? totalAmount : originalQuotation.totalAmount,
      validityDate: validityDate || originalQuotation.validityDate,
      termsConditions: termsConditions || originalQuotation.termsConditions,
      remarks: remarks || originalQuotation.remarks,
      items: items || originalQuotation.items,
      revisionNumber: revCount + 1,
      parentQuotationId: baseParentId,
      status: status || 'Draft',
      EnquiryId: originalQuotation.EnquiryId,
      CompanyId: req.user.CompanyId
    });

    res.status(201).json(newRevision);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create quotation revision' });
  }
});

// PUT /api/quotations/:id — update quotation details
router.put('/:id', authenticateToken, requireRole(['Admin', 'SalesExecutive']), async (req, res) => {
  try {
    const quotation = await Quotation.findOne({
      where: { id: req.params.id, CompanyId: req.user.CompanyId }
    });
    if (!quotation) return res.status(404).json({ error: 'Quotation not found' });

    const { 
      date, CustomerMasterId, clientName, totalAmount, validityDate, 
      termsConditions, remarks, items, status, EnquiryId, customFields 
    } = req.body;

    const finalCustomerMasterId = (CustomerMasterId === undefined) ? quotation.CustomerMasterId : (CustomerMasterId || null);
    const finalEnquiryId = (EnquiryId === undefined) ? quotation.EnquiryId : (EnquiryId || null);

    await quotation.update({
      date: date || quotation.date,
      CustomerMasterId: finalCustomerMasterId,
      clientName: clientName !== undefined ? clientName : quotation.clientName,
      totalAmount: totalAmount !== undefined ? totalAmount : quotation.totalAmount,
      validityDate: validityDate !== undefined ? validityDate : quotation.validityDate,
      termsConditions: termsConditions !== undefined ? termsConditions : quotation.termsConditions,
      remarks: remarks !== undefined ? remarks : quotation.remarks,
      items: items !== undefined ? items : quotation.items,
      status: status || quotation.status,
      EnquiryId: finalEnquiryId,
      customFields: customFields !== undefined ? customFields : quotation.customFields
    });

    res.json(quotation);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update quotation' });
  }
});

// DELETE /api/quotations/:id — delete quotation
router.delete('/:id', authenticateToken, requireRole(['Admin']), async (req, res) => {
  try {
    const quotation = await Quotation.findOne({
      where: { id: req.params.id, CompanyId: req.user.CompanyId }
    });
    if (!quotation) return res.status(404).json({ error: 'Quotation not found' });

    await quotation.destroy();
    res.json({ message: 'Quotation deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete quotation' });
  }
});

// POST /api/quotations/:id/email — send quotation via email
router.post('/:id/email', authenticateToken, async (req, res) => {
  try {
    const { to, subject, message } = req.body;
    
    if (!to || !subject || !message) {
      return res.status(400).json({ error: 'Email, subject, and message are required' });
    }

    const quotation = await Quotation.findOne({
      where: { id: req.params.id, CompanyId: req.user.CompanyId }
    });
    
    if (!quotation) {
      return res.status(404).json({ error: 'Quotation not found' });
    }

    // Create HTML email body
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; color: #333;">
        <div style="white-space: pre-wrap; line-height: 1.6; margin-bottom: 20px;">
          ${message}
        </div>
        <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;" />
        <p style="font-size: 12px; color: #666;">
          <strong>Quotation Details:</strong><br/>
          Quotation #: ${quotation.quotationNumber}<br/>
          Date: ${new Date(quotation.date).toLocaleDateString('en-IN')}<br/>
          Amount: ₹${parseFloat(quotation.totalAmount).toLocaleString('en-IN')}
        </p>
      </div>
    `;

    // Send email
    await sendEmail(to, subject, htmlContent);
    
    res.json({ message: 'Quotation emailed successfully' });
  } catch (error) {
    console.error('Error sending quotation email:', error);
    res.status(500).json({ error: 'Failed to send email: ' + error.message });
  }
});

export default router;
