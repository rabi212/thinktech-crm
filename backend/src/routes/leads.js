import express from 'express';
import { Op } from 'sequelize';
import ExcelJS from 'exceljs';
import Company from '../models/company.js';
import Lead from '../models/lead.js';
import LeadActivity from '../models/leadActivity.js';
import EmployeeMaster from '../models/employeeMaster.js';
import CustomerMaster from '../models/customerMaster.js';
import Enquiry from '../models/enquiry.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import MasterField from '../models/masterField.js';

const router = express.Router();

// Helper: generate next lead code for a company
const generateLeadCode = async (companyId) => {
  const count = await Lead.count({ where: { CompanyId: companyId } });
  const nextNum = String(count + 1).padStart(4, '0');
  return `LED-${nextNum}`;
};

// Helper: generate next customer code for a company
const generateCustomerCode = async (companyId) => {
  const count = await CustomerMaster.count({ where: { CompanyId: companyId } });
  const nextNum = String(count + 1).padStart(4, '0');
  return `CUST-${nextNum}`;
};

// GET /api/leads - Fetch all leads with optional filter/search
router.get('/', authenticateToken, requireRole(['Admin', 'SalesExecutive', 'Management']), async (req, res) => {
  try {
    const { search, leadSource, leadStatus, AssignedToId } = req.query;
    const whereClause = { CompanyId: req.user.CompanyId };

    if (search) {
      whereClause[Op.or] = [
        { leadTitle: { [Op.like]: `%${search}%` } },
        { leadCode: { [Op.like]: `%${search}%` } },
        { contactName: { [Op.like]: `%${search}%` } },
        { companyName: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { phone: { [Op.like]: `%${search}%` } }
      ];
    }

    if (leadSource) {
      whereClause.leadSource = leadSource;
    }

    if (leadStatus) {
      whereClause.leadStatus = leadStatus;
    }

    if (AssignedToId) {
      whereClause.AssignedToId = AssignedToId;
    }

    const leads = await Lead.findAll({
      where: whereClause,
      include: [
        { model: EmployeeMaster, as: 'AssignedTo', attributes: ['id', 'employeeName', 'employeeCode'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json(leads);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
});

// GET /api/leads/export - Export all leads to a designed Excel file (.xlsx)
router.get('/export', authenticateToken, requireRole(['Admin', 'Management']), async (req, res) => {
  try {
    const company = await Company.findByPk(req.user.CompanyId);
    const companyName = company ? company.name : 'ThinkTech CRM';

    const fields = await MasterField.findAll({
      where: { CompanyId: req.user.CompanyId, module: 'Lead' },
      order: [['sortOrder', 'ASC']]
    });

    const visibleFields = fields.filter(f => f.visible);
    if (visibleFields.length === 0) {
      return res.status(400).json({ error: 'No fields configured for export.' });
    }

    // Create Workbook & Sheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Leads Pipeline');

    // Show gridlines
    worksheet.views = [{ showGridLines: true }];

    // Column letters boundary helper (e.g. A to Z)
    const getColLetter = (index) => String.fromCharCode(65 + index);
    const lastColLetter = getColLetter(visibleFields.length - 1);

    // 1. Title Row: Company Name
    worksheet.mergeCells(`A2:${lastColLetter}2`);
    const companyCell = worksheet.getCell('A2');
    companyCell.value = companyName.toUpperCase();
    companyCell.font = { name: 'Segoe UI', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
    companyCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF5B21B6' } }; // Deep Purple
    companyCell.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(2).height = 42;

    // 2. Subheader Row: Module Description
    worksheet.mergeCells(`A3:${lastColLetter}3`);
    const reportCell = worksheet.getCell('A3');
    reportCell.value = 'CRM LEAD MANAGEMENT PIPELINE REPORT';
    reportCell.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FF5B21B6' } };
    reportCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3E8FF' } }; // Light Purple
    reportCell.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(3).height = 24;

    // 3. Metadata Row
    worksheet.mergeCells(`A4:${lastColLetter}4`);
    const metaCell = worksheet.getCell('A4');
    
    // Fetch all leads
    const leads = await Lead.findAll({
      where: { CompanyId: req.user.CompanyId },
      include: [
        { model: EmployeeMaster, as: 'AssignedTo', attributes: ['employeeName'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    metaCell.value = `Exported on: ${new Date().toLocaleString('en-IN')} | Total active deals: ${leads.length}`;
    metaCell.font = { name: 'Segoe UI', size: 9.5, italic: true, color: { argb: 'FF7C3AED' } };
    metaCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3E8FF' } };
    metaCell.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(4).height = 22;

    // Blank row 5
    worksheet.getRow(5).height = 15;

    // 4. Header Row (Row 6)
    const headerRowNumber = 6;
    const headerRow = worksheet.getRow(headerRowNumber);
    headerRow.height = 28;

    visibleFields.forEach((f, idx) => {
      const cell = headerRow.getCell(idx + 1);
      cell.value = f.label;
      cell.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF7C3AED' } }; // Purple Accent
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF6D28D9' } },
        left: { style: 'thin', color: { argb: 'FF6D28D9' } },
        bottom: { style: 'medium', color: { argb: 'FF4C1D95' } },
        right: { style: 'thin', color: { argb: 'FF6D28D9' } }
      };
    });

    // 5. Data Rows (Row 7 onwards)
    leads.forEach((lead, rowIdx) => {
      const currentRowNum = rowIdx + 7;
      const row = worksheet.getRow(currentRowNum);
      row.height = 22;

      const isEven = rowIdx % 2 === 0;
      const rowBgColor = isEven ? 'FFFFFFFF' : 'FFFDFBFF'; // Clean, soft striping

      visibleFields.forEach((f, colIdx) => {
        const cell = row.getCell(colIdx + 1);
        
        let val = '';
        if (f.fieldName === 'AssignedToId') {
          val = lead.AssignedTo?.employeeName || '';
        } else if (f.isCustom) {
          const customJson = lead.customFields || {};
          val = customJson[f.fieldName] || '';
        } else {
          val = lead[f.fieldName] || '';
        }

        cell.value = val;
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBgColor } };
        cell.font = { name: 'Segoe UI', size: 10 };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
        };

        // Alignments & Number formats
        if (f.fieldName === 'estimatedValue') {
          cell.value = parseFloat(val) || 0;
          cell.numFmt = '₹#,##0.00';
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
        } else if (f.type === 'number') {
          cell.value = Number(val) || 0;
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
        } else if (f.type === 'date' || f.fieldName === 'nextFollowUpDate') {
          if (val) {
            cell.value = new Date(val);
            cell.numFmt = 'yyyy-mm-dd';
          }
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        } else if (f.fieldName === 'leadCode') {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF7C3AED' } };
        } else {
          cell.alignment = { horizontal: 'left', vertical: 'middle' };
        }
      });
    });

    // Auto-fit Columns Width
    visibleFields.forEach((col, colIdx) => {
      let maxLength = col.label.length;
      leads.forEach(lead => {
        let val = '';
        if (col.fieldName === 'AssignedToId') {
          val = lead.AssignedTo?.employeeName || '';
        } else if (col.isCustom) {
          const customJson = lead.customFields || {};
          val = customJson[col.fieldName] || '';
        } else {
          val = lead[col.fieldName] || '';
        }
        if (val) maxLength = Math.max(maxLength, String(val).length);
      });
      worksheet.getColumn(colIdx + 1).width = Math.max(maxLength + 4, 16);
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=leads_export.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to export leads' });
  }
});

// GET /api/leads/import-template - Download blank Excel template
router.get('/import-template', authenticateToken, requireRole(['Admin']), async (req, res) => {
  try {
    const fields = await MasterField.findAll({
      where: { CompanyId: req.user.CompanyId, module: 'Lead' },
      order: [['sortOrder', 'ASC']]
    });

    // Exclude auto-generated or system fields like leadCode
    const visibleFields = fields.filter(f => f.visible && f.fieldName !== 'leadCode');

    // Create workbook & sheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Import Template');

    // Enable gridlines
    worksheet.views = [{ showGridLines: true }];

    // 1. Header row
    const headerRow = worksheet.getRow(1);
    headerRow.height = 26;

    visibleFields.forEach((f, idx) => {
      const cell = headerRow.getCell(idx + 1);
      cell.value = f.label;
      cell.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF7C3AED' } }; // Purple
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });

    // 2. Sample Data row
    const sampleRow = worksheet.getRow(2);
    sampleRow.height = 20;

    visibleFields.forEach((f, idx) => {
      const cell = sampleRow.getCell(idx + 1);
      
      let sampleVal = '';
      if (f.fieldName === 'leadTitle') sampleVal = 'Enterprise Deal';
      else if (f.fieldName === 'contactName') sampleVal = 'Shyam Shukla';
      else if (f.fieldName === 'companyName') sampleVal = 'ThinkTech Solutions';
      else if (f.fieldName === 'email') sampleVal = 'shyam@thinktech.com';
      else if (f.fieldName === 'phone') sampleVal = '9876543210';
      else if (f.fieldName === 'estimatedValue') sampleVal = 45000;
      else if (f.fieldName === 'leadSource') sampleVal = 'Website';
      else if (f.fieldName === 'leadStatus') sampleVal = 'New';
      else if (f.fieldName === 'nextFollowUpDate') sampleVal = '2026-07-10';
      else if (f.fieldName === 'description') sampleVal = 'Interested in custom CRM implementation.';
      else if (f.type === 'number') sampleVal = 1000;
      else if (f.type === 'date') sampleVal = '2026-07-01';
      
      cell.value = sampleVal;
      cell.font = { name: 'Segoe UI', size: 10, color: { argb: 'FF64748B' } }; // grey placeholder text
    });

    // Column widths auto-fit
    visibleFields.forEach((col, colIdx) => {
      worksheet.getColumn(colIdx + 1).width = Math.max(col.label.length + 6, 16);
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=leads_import_template.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to download template.' });
  }
});

// POST /api/leads/import - Import leads from binary Excel file (.xlsx) base64
router.post('/import', authenticateToken, requireRole(['Admin']), async (req, res) => {
  try {
    const { excelData } = req.body;
    if (!excelData) return res.status(400).json({ error: 'Excel binary data is required.' });

    // Load Excel workbook from Base64
    const buffer = Buffer.from(excelData, 'base64');
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    const worksheet = workbook.getWorksheet(1);
    if (!worksheet) return res.status(400).json({ error: 'Excel file is empty.' });

    const fields = await MasterField.findAll({
      where: { CompanyId: req.user.CompanyId, module: 'Lead' }
    });

    const headerRow = worksheet.getRow(1);
    const headerLabels = [];
    headerRow.eachCell({ includeEmpty: false }, (cell) => {
      headerLabels.push(cell.value ? String(cell.value).trim() : '');
    });

    if (headerLabels.length === 0) {
      return res.status(400).json({ error: 'Excel sheet does not contain a header row.' });
    }

    // Map headers to fields
    const headerMap = headerLabels.map(label => {
      const field = fields.find(f => f.label.toLowerCase().trim() === label.toLowerCase().trim());
      return field ? { fieldName: field.fieldName, isCustom: field.isCustom, label: field.label } : null;
    });

    const createdLeads = [];
    const errors = [];
    const employees = await EmployeeMaster.findAll({ where: { CompanyId: req.user.CompanyId } });

    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber === 1) return; // skip header row

      const leadData = {
        CompanyId: req.user.CompanyId,
        leadStatus: 'New',
        estimatedValue: 0.00,
        customFields: {}
      };

      let hasData = false;
      headerMap.forEach((mapItem, colIdx) => {
        if (!mapItem) return;
        const cell = row.getCell(colIdx + 1);
        let val = cell.value;

        // Resolve richText and formulas
        if (val && typeof val === 'object') {
          if (val.richText) {
            val = val.richText.map(t => t.text).join('');
          } else if (val.result !== undefined) {
            val = val.result;
          }
        }

        val = val !== null && val !== undefined ? String(val).trim() : '';
        if (val !== '') hasData = true;

        if (mapItem.fieldName === 'AssignedToId') {
          const emp = employees.find(e => e.employeeName.toLowerCase().trim() === val.toLowerCase());
          if (emp) leadData.AssignedToId = emp.id;
        } else if (mapItem.isCustom) {
          leadData.customFields[mapItem.fieldName] = val;
        } else {
          leadData[mapItem.fieldName] = val;
        }
      });

      if (!hasData) return; // skip empty rows

      // Validations
      if (!leadData.leadTitle || leadData.leadTitle.trim() === '') {
        errors.push(`Row ${rowNumber}: Lead Title is required.`);
      }
      if (!leadData.contactName || leadData.contactName.trim() === '') {
        errors.push(`Row ${rowNumber}: Contact Name is required.`);
      }

      createdLeads.push(leadData);
    });

    if (errors.length > 0) {
      return res.status(400).json({ error: 'Import validation failed', details: errors });
    }

    if (createdLeads.length > 0) {
      const instances = await Lead.bulkCreate(createdLeads);
      
      // Seed initial creation logs
      const systemActivities = instances.map(inst => ({
        LeadId: inst.id,
        activityType: 'System',
        notes: 'Lead created successfully via Excel (.xlsx) import.',
        CompanyId: req.user.CompanyId
      }));
      await LeadActivity.bulkCreate(systemActivities);
    }

    res.json({ success: true, count: createdLeads.length });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to import leads.' });
  }
});

// GET /api/leads/:id - Fetch single lead
router.get('/:id', authenticateToken, requireRole(['Admin', 'SalesExecutive', 'Management']), async (req, res) => {
  try {
    const lead = await Lead.findOne({
      where: { id: req.params.id, CompanyId: req.user.CompanyId },
      include: [
        { model: EmployeeMaster, as: 'AssignedTo', attributes: ['id', 'employeeName', 'employeeCode'] }
      ]
    });

    if (!lead) return res.status(404).json({ error: 'Lead not found' });
    res.json(lead);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch lead' });
  }
});

// POST /api/leads - Create lead
router.post('/', authenticateToken, requireRole(['Admin', 'SalesExecutive']), async (req, res) => {
  try {
    const {
      leadTitle, companyName, contactName, email, phone, leadSource,
      leadStatus, estimatedValue, AssignedToId, nextFollowUpDate, description,
      leadCode, customFields
    } = req.body;

    let code = leadCode;
    if (!code || code.trim() === '') {
      code = await generateLeadCode(req.user.CompanyId);
    }

    const newLead = await Lead.create({
      leadCode: code,
      leadTitle,
      companyName,
      contactName,
      email,
      phone,
      leadSource: leadSource || 'Direct',
      leadStatus: leadStatus || 'New',
      estimatedValue: estimatedValue || 0.00,
      AssignedToId: AssignedToId || null,
      nextFollowUpDate: nextFollowUpDate || null,
      description,
      customFields,
      CompanyId: req.user.CompanyId
    });

    // Create default system activity log
    await LeadActivity.create({
      LeadId: newLead.id,
      activityType: 'System',
      notes: `Lead created successfully under code ${code}.`,
      CreatedByUserId: req.user.id,
      CompanyId: req.user.CompanyId
    });

    const fullLead = await Lead.findOne({
      where: { id: newLead.id },
      include: [{ model: EmployeeMaster, as: 'AssignedTo', attributes: ['id', 'employeeName', 'employeeCode'] }]
    });

    res.status(201).json(fullLead);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create lead' });
  }
});

// PUT /api/leads/:id - Update lead
router.put('/:id', authenticateToken, requireRole(['Admin', 'SalesExecutive']), async (req, res) => {
  try {
    const lead = await Lead.findOne({ where: { id: req.params.id, CompanyId: req.user.CompanyId } });
    if (!lead) return res.status(404).json({ error: 'Lead not found' });

    const oldStatus = lead.leadStatus;

    const {
      leadTitle, companyName, contactName, email, phone, leadSource,
      leadStatus, estimatedValue, AssignedToId, nextFollowUpDate, description,
      lostReason, customFields
    } = req.body;

    await lead.update({
      leadTitle,
      companyName,
      contactName,
      email,
      phone,
      leadSource,
      leadStatus,
      estimatedValue,
      AssignedToId: AssignedToId || null,
      nextFollowUpDate,
      description,
      lostReason: leadStatus === 'Lost' ? lostReason : null,
      customFields
    });

    // Check if status changed to log system activity
    if (leadStatus && leadStatus !== oldStatus) {
      await LeadActivity.create({
        LeadId: lead.id,
        activityType: 'System',
        notes: `Status changed from ${oldStatus} to ${leadStatus}.${leadStatus === 'Lost' && lostReason ? ` Reason: ${lostReason}` : ''}`,
        CreatedByUserId: req.user.id,
        CompanyId: req.user.CompanyId
      });
    }

    const fullLead = await Lead.findOne({
      where: { id: lead.id },
      include: [{ model: EmployeeMaster, as: 'AssignedTo', attributes: ['id', 'employeeName', 'employeeCode'] }]
    });

    res.json(fullLead);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update lead' });
  }
});

// DELETE /api/leads/:id - Delete lead
router.delete('/:id', authenticateToken, requireRole(['Admin']), async (req, res) => {
  try {
    const lead = await Lead.findOne({ where: { id: req.params.id, CompanyId: req.user.CompanyId } });
    if (!lead) return res.status(404).json({ error: 'Lead not found' });

    // Delete associated activities first
    await LeadActivity.destroy({ where: { LeadId: lead.id } });
    await lead.destroy();

    res.json({ message: 'Lead deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete lead' });
  }
});

// POST /api/leads/:id/convert - Convert Lead to Customer and/or Enquiry
router.post('/:id/convert', authenticateToken, requireRole(['Admin', 'SalesExecutive']), async (req, res) => {
  try {
    const lead = await Lead.findOne({ where: { id: req.params.id, CompanyId: req.user.CompanyId } });
    if (!lead) return res.status(404).json({ error: 'Lead not found' });

    const { convertToCustomer, convertToEnquiry, enquiryTitle, details } = req.body;
    let newCustomer = null;
    let newEnquiry = null;
    let activityLogNotes = [];

    if (convertToCustomer) {
      const code = await generateCustomerCode(req.user.CompanyId);
      newCustomer = await CustomerMaster.create({
        customerCode: code,
        customerName: lead.contactName,
        companyName: lead.companyName || lead.contactName,
        contactPerson: lead.contactName,
        mobileNumber: lead.phone,
        email: lead.email,
        status: 'Active',
        CompanyId: req.user.CompanyId
      });
      activityLogNotes.push(`Converted to Customer (${newCustomer.companyName} [${code}])`);
    }

    if (convertToEnquiry) {
      let customerId = newCustomer?.id;
      if (!customerId) {
        // Try to find an existing CustomerMaster with the company/contact name
        const existingCustomer = await CustomerMaster.findOne({
          where: {
            companyName: lead.companyName || lead.contactName,
            CompanyId: req.user.CompanyId
          }
        });
        if (existingCustomer) {
          customerId = existingCustomer.id;
        } else {
          // Auto-create a customer master to satisfy database null constraints
          const code = await generateCustomerCode(req.user.CompanyId);
          const autoCustomer = await CustomerMaster.create({
            customerCode: code,
            customerName: lead.contactName,
            companyName: lead.companyName || lead.contactName,
            contactPerson: lead.contactName,
            mobileNumber: lead.phone,
            email: lead.email,
            status: 'Active',
            CompanyId: req.user.CompanyId
          });
          customerId = autoCustomer.id;
          newCustomer = autoCustomer;
          activityLogNotes.push(`Auto-created Customer (${autoCustomer.companyName} [${code}])`);
        }
      }

      const enqCount = await Enquiry.count({ where: { CompanyId: req.user.CompanyId } });
      const enqCode = `ENQ-${String(enqCount + 1).padStart(4, '0')}`;

      newEnquiry = await Enquiry.create({
        enquiryNumber: enqCode,
        enquiryDate: new Date(),
        CustomerMasterId: customerId,
        contactName: lead.contactName,
        productService: enquiryTitle || `Enquiry for ${lead.leadTitle}`,
        quantity: 1,
        expectedClosingDate: null,
        AssignedToId: lead.AssignedToId || null,
        status: 'New',
        details: details || lead.description || `Enquiry generated from lead: ${lead.leadTitle}`,
        estimatedValue: lead.estimatedValue || 0.00,
        CompanyId: req.user.CompanyId
      });
      activityLogNotes.push(`Converted to Enquiry (${newEnquiry.enquiryNumber})`);
    }

    // Update lead status to Converted
    await lead.update({ leadStatus: 'Converted' });

    // Log conversion in activities
    await LeadActivity.create({
      LeadId: lead.id,
      activityType: 'System',
      notes: `Lead successfully converted! Actions: ${activityLogNotes.join(', ')}`,
      CreatedByUserId: req.user.id,
      CompanyId: req.user.CompanyId
    });

    res.json({
      message: 'Lead converted successfully',
      customer: newCustomer,
      enquiry: newEnquiry
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to convert lead' });
  }
});

export default router;
