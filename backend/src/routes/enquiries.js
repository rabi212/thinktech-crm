import express from 'express';
import { Op } from 'sequelize';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import ExcelJS from 'exceljs';
import Enquiry from '../models/enquiry.js';
import EnquiryActivity from '../models/enquiryActivity.js';
import EnquiryAttachment from '../models/enquiryAttachment.js';
import CustomerMaster from '../models/customerMaster.js';
import EmployeeMaster from '../models/employeeMaster.js';
import User from '../models/user.js';
import Quotation from '../models/quotation.js';
import Company from '../models/company.js';
import MasterField from '../models/masterField.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper: generate next enquiry code for a company
const generateEnquiryCode = async (companyId) => {
  const count = await Enquiry.count({ where: { CompanyId: companyId } });
  const nextNum = String(count + 1).padStart(4, '0');
  return `ENQ-${nextNum}`;
};

// GET /api/enquiries - Fetch all enquiries with optional search/filters
router.get('/', authenticateToken, requireRole(['Admin', 'SalesExecutive', 'Management']), async (req, res) => {
  try {
    const { search, status, AssignedToId } = req.query;
    const whereClause = { CompanyId: req.user.CompanyId };

    if (search) {
      whereClause[Op.or] = [
        { enquiryNumber: { [Op.like]: `%${search}%` } },
        { contactName: { [Op.like]: `%${search}%` } },
        { productService: { [Op.like]: `%${search}%` } },
        { details: { [Op.like]: `%${search}%` } }
      ];
    }

    if (status) {
      whereClause.status = status;
    }

    if (AssignedToId) {
      whereClause.AssignedToId = AssignedToId;
    }

    const enquiries = await Enquiry.findAll({
      where: whereClause,
      include: [
        { model: CustomerMaster, attributes: ['id', 'customerName', 'companyName'] },
        { model: EmployeeMaster, as: 'AssignedTo', attributes: ['id', 'employeeName'] },
        { model: EnquiryAttachment, attributes: ['id', 'fileName', 'filePath', 'fileMime'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json(enquiries);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch enquiries' });
  }
});

// GET /api/enquiries/export - Export all enquiries to designed Excel file
router.get('/export', authenticateToken, requireRole(['Admin', 'Management']), async (req, res) => {
  try {
    const company = await Company.findByPk(req.user.CompanyId);
    const companyName = company ? company.name : 'ThinkTech CRM';

    const fields = await MasterField.findAll({
      where: { CompanyId: req.user.CompanyId, module: 'Enquiry' },
      order: [['sortOrder', 'ASC']]
    });

    const visibleFields = fields.filter(f => f.visible);
    if (visibleFields.length === 0) {
      return res.status(400).json({ error: 'No fields configured for export.' });
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Enquiries Pipeline');

    worksheet.views = [{ showGridLines: true }];

    const getColLetter = (index) => String.fromCharCode(65 + index);
    const lastColLetter = getColLetter(visibleFields.length - 1);

    // Title Row
    worksheet.mergeCells(`A2:${lastColLetter}2`);
    const companyCell = worksheet.getCell('A2');
    companyCell.value = companyName.toUpperCase();
    companyCell.font = { name: 'Segoe UI', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
    companyCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF5B21B6' } }; // Deep Purple
    companyCell.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(2).height = 42;

    // Subheader Row
    worksheet.mergeCells(`A3:${lastColLetter}3`);
    const reportCell = worksheet.getCell('A3');
    reportCell.value = 'CRM ENQUIRY PIPELINE REPORT';
    reportCell.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FF5B21B6' } };
    reportCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3E8FF' } }; // Light Purple
    reportCell.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(3).height = 24;

    // Metadata Row
    worksheet.mergeCells(`A4:${lastColLetter}4`);
    const metaCell = worksheet.getCell('A4');

    const enquiries = await Enquiry.findAll({
      where: { CompanyId: req.user.CompanyId },
      include: [
        { model: CustomerMaster, attributes: ['customerName'] },
        { model: EmployeeMaster, as: 'AssignedTo', attributes: ['employeeName'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    metaCell.value = `Exported on: ${new Date().toLocaleString('en-IN')} | Total pipeline enquiries: ${enquiries.length}`;
    metaCell.font = { name: 'Segoe UI', size: 9.5, italic: true, color: { argb: 'FF7C3AED' } };
    metaCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3E8FF' } };
    metaCell.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(4).height = 22;

    worksheet.getRow(5).height = 15; // blank spacer

    // Header Row
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

    // Data Rows
    enquiries.forEach((enq, rowIdx) => {
      const currentRowNum = rowIdx + 7;
      const row = worksheet.getRow(currentRowNum);
      row.height = 22;

      const isEven = rowIdx % 2 === 0;
      const rowBgColor = isEven ? 'FFFFFFFF' : 'FFFDFBFF'; // Clean, soft purple striping

      visibleFields.forEach((f, colIdx) => {
        const cell = row.getCell(colIdx + 1);
        let val = '';
        if (f.fieldName === 'CustomerMasterId') {
          val = enq.CustomerMaster?.customerName || '';
        } else if (f.fieldName === 'AssignedToId') {
          val = enq.AssignedTo?.employeeName || '';
        } else if (f.isCustom) {
          const customJson = enq.customFields ? (typeof enq.customFields === 'string' ? JSON.parse(enq.customFields) : enq.customFields) : {};
          val = customJson[f.fieldName] || '';
        } else {
          val = enq[f.fieldName] || '';
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

        if (f.fieldName === 'estimatedValue') {
          cell.value = parseFloat(val) || 0;
          cell.numFmt = '₹#,##0.00';
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
        } else if (f.fieldName === 'quantity') {
          cell.value = Number(val) || 0;
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
        } else if (f.type === 'number') {
          cell.value = Number(val) || 0;
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
        } else if (f.type === 'date' || f.fieldName === 'enquiryDate' || f.fieldName === 'expectedClosingDate') {
          if (val) {
            cell.value = new Date(val);
            cell.numFmt = 'yyyy-mm-dd';
          }
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        } else if (f.fieldName === 'enquiryNumber') {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF7C3AED' } };
        } else {
          cell.alignment = { horizontal: 'left', vertical: 'middle' };
        }
      });
    });

    // Auto-fit Columns width
    visibleFields.forEach((col, colIdx) => {
      let maxLength = col.label.length;
      enquiries.forEach(enq => {
        let val = '';
        if (col.fieldName === 'CustomerMasterId') {
          val = enq.CustomerMaster?.customerName || '';
        } else if (col.fieldName === 'AssignedToId') {
          val = enq.AssignedTo?.employeeName || '';
        } else if (col.isCustom) {
          const customJson = enq.customFields ? (typeof enq.customFields === 'string' ? JSON.parse(enq.customFields) : enq.customFields) : {};
          val = customJson[col.fieldName] || '';
        } else {
          val = enq[col.fieldName] || '';
        }
        if (val) maxLength = Math.max(maxLength, String(val).length);
      });
      worksheet.getColumn(colIdx + 1).width = Math.max(maxLength + 4, 16);
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=enquiries_export.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to export enquiries' });
  }
});

// GET /api/enquiries/import-template - Download blank Excel template for enquiries
router.get('/import-template', authenticateToken, requireRole(['Admin']), async (req, res) => {
  try {
    const fields = await MasterField.findAll({
      where: { CompanyId: req.user.CompanyId, module: 'Enquiry' },
      order: [['sortOrder', 'ASC']]
    });

    // Exclude auto-generated fields like enquiryNumber
    const visibleFields = fields.filter(f => f.visible && f.fieldName !== 'enquiryNumber');

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Enquiries Template');

    worksheet.views = [{ showGridLines: true }];

    const headerRow = worksheet.getRow(1);
    headerRow.height = 26;

    visibleFields.forEach((f, idx) => {
      const cell = headerRow.getCell(idx + 1);
      cell.value = f.label;
      cell.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF7C3AED' } }; // Purple Accent
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });

    const sampleRow = worksheet.getRow(2);
    sampleRow.height = 20;

    visibleFields.forEach((f, idx) => {
      const cell = sampleRow.getCell(idx + 1);
      let sampleVal = '';
      if (f.fieldName === 'enquiryDate') sampleVal = '2026-06-29';
      else if (f.fieldName === 'CustomerMasterId') sampleVal = 'ThinkTech Solutions';
      else if (f.fieldName === 'contactName') sampleVal = 'Shyam Shukla';
      else if (f.fieldName === 'productService') sampleVal = 'Custom CRM Implementation';
      else if (f.fieldName === 'quantity') sampleVal = 1;
      else if (f.fieldName === 'expectedClosingDate') sampleVal = '2026-07-31';
      else if (f.fieldName === 'status') sampleVal = 'New';
      else if (f.fieldName === 'estimatedValue') sampleVal = 50000;
      else if (f.fieldName === 'details') sampleVal = 'Customer requires customized modules for leads and enquiries.';
      else if (f.type === 'number') sampleVal = 10;
      else if (f.type === 'date') sampleVal = '2026-07-01';

      cell.value = sampleVal;
      cell.font = { name: 'Segoe UI', size: 10, color: { argb: 'FF64748B' } };
    });

    visibleFields.forEach((col, colIdx) => {
      worksheet.getColumn(colIdx + 1).width = Math.max(col.label.length + 6, 16);
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=enquiries_import_template.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to download import template.' });
  }
});

// POST /api/enquiries/import - Import enquiries from Base64 excelData
router.post('/import', authenticateToken, requireRole(['Admin']), async (req, res) => {
  try {
    const { excelData } = req.body;
    if (!excelData) return res.status(400).json({ error: 'Excel data is required.' });

    const buffer = Buffer.from(excelData, 'base64');
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    const worksheet = workbook.getWorksheet(1);
    if (!worksheet) return res.status(400).json({ error: 'Excel file is empty.' });

    const fields = await MasterField.findAll({
      where: { CompanyId: req.user.CompanyId, module: 'Enquiry' }
    });

    const headerRow = worksheet.getRow(1);
    const headerLabels = [];
    headerRow.eachCell({ includeEmpty: false }, (cell) => {
      headerLabels.push(cell.value ? String(cell.value).trim() : '');
    });

    if (headerLabels.length === 0) {
      return res.status(400).json({ error: 'Excel sheet does not contain a header row.' });
    }

    const headerMap = headerLabels.map(label => {
      const field = fields.find(f => f.label.toLowerCase().trim() === label.toLowerCase().trim());
      return field ? { fieldName: field.fieldName, isCustom: field.isCustom, label: field.label } : null;
    });

    const createdEnquiries = [];
    const errors = [];
    
    // Cache relations
    const employees = await EmployeeMaster.findAll({ where: { CompanyId: req.user.CompanyId } });
    const customers = await CustomerMaster.findAll({ where: { CompanyId: req.user.CompanyId } });

    for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
      const row = worksheet.getRow(rowNumber);
      if (!row) continue;

      // Check if row has any actual content
      let hasData = false;
      row.eachCell({ includeEmpty: false }, () => { hasData = true; });
      if (!hasData) continue;

      const enqData = {
        CompanyId: req.user.CompanyId,
        enquiryDate: new Date(),
        quantity: 1,
        status: 'New',
        estimatedValue: 0.00,
        customFields: {}
      };

      let customerNameVal = '';

      headerMap.forEach((mapItem, colIdx) => {
        if (!mapItem) return;
        const cell = row.getCell(colIdx + 1);
        let val = cell.value;

        if (val && typeof val === 'object') {
          if (val.richText) {
            val = val.richText.map(t => t.text).join('');
          } else if (val.result !== undefined) {
            val = val.result;
          }
        }

        val = val !== null && val !== undefined ? String(val).trim() : '';

        if (mapItem.fieldName === 'CustomerMasterId') {
          customerNameVal = val;
        } else if (mapItem.fieldName === 'AssignedToId') {
          const emp = employees.find(e => e.employeeName.toLowerCase().trim() === val.toLowerCase());
          if (emp) enqData.AssignedToId = emp.id;
        } else if (mapItem.isCustom) {
          enqData.customFields[mapItem.fieldName] = val;
        } else {
          enqData[mapItem.fieldName] = val;
        }
      });

      // Resolve or auto-create CustomerMaster
      if (customerNameVal) {
        let cust = customers.find(c => c.customerName.toLowerCase().trim() === customerNameVal.toLowerCase() || c.companyName.toLowerCase().trim() === customerNameVal.toLowerCase());
        if (!cust) {
          // Auto-create Customer Account
          const count = await CustomerMaster.count({ where: { CompanyId: req.user.CompanyId } });
          const code = `CUST-${String(count + 1).padStart(4, '0')}`;
          cust = await CustomerMaster.create({
            customerCode: code,
            customerName: customerNameVal,
            companyName: customerNameVal,
            contactPerson: customerNameVal,
            status: 'Active',
            CompanyId: req.user.CompanyId
          });
          // Cache it for subsequent rows
          customers.push(cust);
        }
        enqData.CustomerMasterId = cust.id;
      }

      // Validations
      if (!enqData.CustomerMasterId) {
        errors.push(`Row ${rowNumber}: Customer/Client Name is required.`);
      }
      if (!enqData.productService || enqData.productService.trim() === '') {
        errors.push(`Row ${rowNumber}: Product/Service is required.`);
      }

      createdEnquiries.push(enqData);
    }

    if (errors.length > 0) {
      return res.status(400).json({ error: 'Import validation failed', details: errors });
    }

    // Now insert
    if (createdEnquiries.length > 0) {
      const startCount = await Enquiry.count({ where: { CompanyId: req.user.CompanyId } });
      
      const preparedEnqs = createdEnquiries.map((enq, idx) => {
        const code = `ENQ-${String(startCount + idx + 1).padStart(4, '0')}`;
        return {
          ...enq,
          enquiryNumber: code,
          customFields: JSON.stringify(enq.customFields)
        };
      });

      const instances = await Enquiry.bulkCreate(preparedEnqs);

      // Seed system creation logs
      const systemActivities = instances.map(inst => ({
        EnquiryId: inst.id,
        activityType: 'System',
        notes: 'Enquiry created successfully via Excel (.xlsx) import.',
        CompanyId: req.user.CompanyId
      }));
      await EnquiryActivity.bulkCreate(systemActivities);
    }

    res.json({ success: true, count: createdEnquiries.length });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to import enquiries.' });
  }
});

// GET /api/enquiries/:id - Fetch single enquiry details
router.get('/:id', authenticateToken, requireRole(['Admin', 'SalesExecutive', 'Management']), async (req, res) => {
  try {
    const enquiry = await Enquiry.findOne({
      where: { id: req.params.id, CompanyId: req.user.CompanyId },
      include: [
        { model: CustomerMaster, attributes: ['id', 'customerName', 'companyName'] },
        { model: EmployeeMaster, as: 'AssignedTo', attributes: ['id', 'employeeName'] },
        { model: EnquiryAttachment, attributes: ['id', 'fileName', 'filePath', 'fileMime'] }
      ]
    });

    if (!enquiry) return res.status(404).json({ error: 'Enquiry not found' });
    res.json(enquiry);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch enquiry' });
  }
});

// POST /api/enquiries - Log a new enquiry
router.post('/', authenticateToken, requireRole(['Admin', 'SalesExecutive']), async (req, res) => {
  try {
    const {
      enquiryNumber,
      enquiryDate, CustomerMasterId, contactName, productService, quantity,
      expectedClosingDate, AssignedToId, status, details, estimatedValue, customFields
    } = req.body;

    let code = enquiryNumber;
    if (!code || code.trim() === '' || code.trim() === 'Auto Generated') {
      code = await generateEnquiryCode(req.user.CompanyId);
    } else {
      code = code.trim();
    }

    const cleanAssignedToId = (AssignedToId === '' || AssignedToId === undefined || AssignedToId === null) ? null : AssignedToId;
    const cleanExpectedClosingDate = (expectedClosingDate === '' || expectedClosingDate === 'Invalid date' || expectedClosingDate === 'Invalid Date' || expectedClosingDate === undefined || expectedClosingDate === null) ? null : expectedClosingDate;
    const cleanEnquiryDate = (enquiryDate === '' || enquiryDate === 'Invalid date' || enquiryDate === 'Invalid Date' || !enquiryDate) ? new Date() : enquiryDate;

    const newEnquiry = await Enquiry.create({
      enquiryNumber: code,
      enquiryDate: cleanEnquiryDate,
      CustomerMasterId,
      contactName,
      productService,
      quantity: quantity || 1,
      expectedClosingDate: cleanExpectedClosingDate,
      AssignedToId: cleanAssignedToId,
      status: status || 'New',
      details,
      estimatedValue: estimatedValue || 0.00,
      customFields: customFields ? (typeof customFields === 'string' ? customFields : JSON.stringify(customFields)) : null,
      CompanyId: req.user.CompanyId
    });

    // Log initial system creation activity
    await EnquiryActivity.create({
      EnquiryId: newEnquiry.id,
      activityType: 'System',
      notes: `Enquiry logged successfully with code ${code}.`,
      CompanyId: req.user.CompanyId
    });

    res.status(201).json(newEnquiry);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create enquiry' });
  }
});

// PUT /api/enquiries/:id - Update enquiry details
router.put('/:id', authenticateToken, requireRole(['Admin', 'SalesExecutive']), async (req, res) => {
  try {
    const enquiry = await Enquiry.findOne({ where: { id: req.params.id, CompanyId: req.user.CompanyId } });
    if (!enquiry) return res.status(404).json({ error: 'Enquiry not found' });

    const {
      enquiryDate, CustomerMasterId, contactName, productService, quantity,
      expectedClosingDate, AssignedToId, status, details, estimatedValue, customFields
    } = req.body;

    const oldStatus = enquiry.status;

    const cleanAssignedToId = (AssignedToId === '' || AssignedToId === undefined || AssignedToId === null) ? null : AssignedToId;
    const cleanExpectedClosingDate = (expectedClosingDate === '' || expectedClosingDate === 'Invalid date' || expectedClosingDate === 'Invalid Date' || expectedClosingDate === undefined || expectedClosingDate === null) ? null : expectedClosingDate;
    const cleanEnquiryDate = (enquiryDate === '' || enquiryDate === 'Invalid date' || enquiryDate === 'Invalid Date' || !enquiryDate) ? enquiry.enquiryDate : enquiryDate;

    await enquiry.update({
      enquiryDate: cleanEnquiryDate,
      CustomerMasterId,
      contactName,
      productService,
      quantity,
      expectedClosingDate: cleanExpectedClosingDate,
      AssignedToId: cleanAssignedToId,
      status,
      details,
      estimatedValue,
      customFields: customFields ? (typeof customFields === 'string' ? customFields : JSON.stringify(customFields)) : null
    });

    // Log transition status if changed
    if (oldStatus !== status) {
      await EnquiryActivity.create({
        EnquiryId: enquiry.id,
        activityType: 'System',
        notes: `Enquiry pipeline status updated: "${oldStatus}" -> "${status}".`,
        CompanyId: req.user.CompanyId
      });
    }

    res.json(enquiry);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update enquiry' });
  }
});

// DELETE /api/enquiries/:id - Delete enquiry
router.delete('/:id', authenticateToken, requireRole(['Admin']), async (req, res) => {
  try {
    const enquiry = await Enquiry.findOne({ where: { id: req.params.id, CompanyId: req.user.CompanyId } });
    if (!enquiry) return res.status(404).json({ error: 'Enquiry not found' });

    await enquiry.destroy();
    res.json({ message: 'Enquiry deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete enquiry' });
  }
});

// GET /api/enquiries/:id/activities - Fetch activity timeline
router.get('/:id/activities', authenticateToken, requireRole(['Admin', 'SalesExecutive', 'Management']), async (req, res) => {
  try {
    const activities = await EnquiryActivity.findAll({
      where: { EnquiryId: req.params.id, CompanyId: req.user.CompanyId },
      include: [
        { model: User, as: 'Creator', attributes: ['id', 'name'] }
      ],
      order: [['createdAt', 'DESC']]
    });
    res.json(activities);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch activities' });
  }
});

// POST /api/enquiries/:id/activities - Log follow-up activity
router.post('/:id/activities', authenticateToken, requireRole(['Admin', 'SalesExecutive']), async (req, res) => {
  try {
    const { activityType, notes, followUpDate } = req.body;
    const enquiry = await Enquiry.findOne({ where: { id: req.params.id, CompanyId: req.user.CompanyId } });
    if (!enquiry) return res.status(404).json({ error: 'Enquiry not found' });

    const newActivity = await EnquiryActivity.create({
      EnquiryId: enquiry.id,
      activityType: activityType || 'Note',
      notes,
      followUpDate,
      CreatedByUserId: req.user.id,
      CompanyId: req.user.CompanyId
    });

    res.status(201).json(newActivity);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to log follow-up activity' });
  }
});

// POST /api/enquiries/:id/attachments - Base64 Upload documents
router.post('/:id/attachments', authenticateToken, requireRole(['Admin', 'SalesExecutive']), async (req, res) => {
  try {
    const { fileName, fileData, fileMime } = req.body; // fileData is base64 string
    if (!fileName || !fileData) {
      return res.status(400).json({ error: 'File name and file content are required.' });
    }

    const enquiry = await Enquiry.findOne({ where: { id: req.params.id, CompanyId: req.user.CompanyId } });
    if (!enquiry) return res.status(404).json({ error: 'Enquiry not found' });

    // Ensure uploads directory exists
    const uploadsDir = path.join(__dirname, '..', '..', 'uploads', 'enquiries');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Sanitize file name and create a unique name
    const ext = path.extname(fileName);
    const baseName = path.basename(fileName, ext).replace(/[^a-zA-Z0-9]/g, '_');
    const uniqueFileName = `${baseName}_${Date.now()}${ext}`;
    const filePath = path.join(uploadsDir, uniqueFileName);

    // Decode and write binary file to disk
    const buffer = Buffer.from(fileData, 'base64');
    fs.writeFileSync(filePath, buffer);

    const relativePath = `/uploads/enquiries/${uniqueFileName}`;

    const attachment = await EnquiryAttachment.create({
      EnquiryId: enquiry.id,
      fileName,
      filePath: relativePath,
      fileMime,
      CompanyId: req.user.CompanyId
    });

    // Log upload in activities log
    await EnquiryActivity.create({
      EnquiryId: enquiry.id,
      activityType: 'System',
      notes: `Document attached: ${fileName}`,
      CompanyId: req.user.CompanyId
    });

    res.status(201).json(attachment);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to attach document.' });
  }
});

// DELETE /api/enquiries/:id/attachments/:attId - Delete attachment
router.delete('/:id/attachments/:attId', authenticateToken, requireRole(['Admin']), async (req, res) => {
  try {
    const attachment = await EnquiryAttachment.findOne({
      where: { id: req.params.attId, EnquiryId: req.params.id, CompanyId: req.user.CompanyId }
    });
    if (!attachment) return res.status(404).json({ error: 'Attachment not found.' });

    // Remove from physical disk if exists
    const fullPath = path.join(__dirname, '..', '..', attachment.filePath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }

    // Log deletion in activities log
    await EnquiryActivity.create({
      EnquiryId: req.params.id,
      activityType: 'System',
      notes: `Document removed: ${attachment.fileName}`,
      CompanyId: req.user.CompanyId
    });

    await attachment.destroy();
    res.json({ message: 'Attachment deleted successfully.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete attachment.' });
  }
});

// POST /api/enquiries/:id/convert-quotation - Convert Enquiry details into a Quotation
router.post('/:id/convert-quotation', authenticateToken, requireRole(['Admin', 'SalesExecutive']), async (req, res) => {
  try {
    const enquiry = await Enquiry.findOne({
      where: { id: req.params.id, CompanyId: req.user.CompanyId },
      include: [{ model: CustomerMaster }]
    });
    if (!enquiry) return res.status(404).json({ error: 'Enquiry not found.' });

    const customer = enquiry.CustomerMaster;
    const clientName = customer ? customer.customerName : enquiry.contactName || 'Unassigned Customer';

    // Auto-generate quotation number
    const qtnCount = await Quotation.count({ where: { CompanyId: req.user.CompanyId } });
    const quotationNumber = `QTN-${new Date().getFullYear()}-${String(qtnCount + 1).padStart(3, '0')}`;

    const quotation = await Quotation.create({
      quotationNumber,
      clientName,
      totalAmount: enquiry.estimatedValue || 0.00,
      details: `Converted from Enquiry ${enquiry.enquiryNumber}. Details: ${enquiry.details || ''}`,
      status: 'Draft',
      EnquiryId: enquiry.id,
      CompanyId: req.user.CompanyId
    });

    // Update enquiry status
    await enquiry.update({ status: 'Quotation Sent' });

    // Log system activities
    await EnquiryActivity.create({
      EnquiryId: enquiry.id,
      activityType: 'System',
      notes: `Converted to Quotation successfully with code ${quotationNumber}.`,
      CompanyId: req.user.CompanyId
    });

    res.status(201).json(quotation);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to convert enquiry to quotation.' });
  }
});

export default router;
