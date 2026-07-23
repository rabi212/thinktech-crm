import express from 'express';
import MasterField from '../models/masterField.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

const defaultFields = {
  Customer: [
    { fieldName: 'customerCode', label: 'Customer Code', type: 'text', required: false, visible: true, isCustom: false },
    { fieldName: 'customerName', label: 'Customer Name', type: 'text', required: true, visible: true, isCustom: false },
    { fieldName: 'companyName', label: 'Company Name', type: 'text', required: false, visible: true, isCustom: false },
    { fieldName: 'contactPerson', label: 'Contact Person', type: 'text', required: false, visible: true, isCustom: false },
    { fieldName: 'mobileNumber', label: 'Mobile Number', type: 'text', required: false, visible: true, isCustom: false },
    { fieldName: 'email', label: 'Email Address', type: 'text', required: false, visible: true, isCustom: false },
    { fieldName: 'gstNumber', label: 'GST Number', type: 'text', required: false, visible: true, isCustom: false },
    { fieldName: 'city', label: 'City', type: 'text', required: false, visible: true, isCustom: false },
    { fieldName: 'state', label: 'State', type: 'text', required: false, visible: true, isCustom: false },
    { fieldName: 'country', label: 'Country', type: 'text', required: false, visible: true, isCustom: false },
    { fieldName: 'creditLimit', label: 'Credit Limit', type: 'number', required: false, visible: true, isCustom: false },
    { fieldName: 'paymentTerms', label: 'Payment Terms', type: 'text', required: false, visible: true, isCustom: false },
    { fieldName: 'billingAddress', label: 'Billing Address', type: 'textarea', required: false, visible: true, isCustom: false },
    { fieldName: 'shippingAddress', label: 'Shipping Address', type: 'textarea', required: false, visible: true, isCustom: false }
  ],
  Vendor: [
    { fieldName: 'vendorCode', label: 'Vendor Code', type: 'text', required: false, visible: true, isCustom: false },
    { fieldName: 'vendorName', label: 'Vendor Name', type: 'text', required: true, visible: true, isCustom: false },
    { fieldName: 'vendorType', label: 'Vendor Type', type: 'select', options: '["Supplier", "Contractor", "Service Provider", "Consultant"]', required: true, visible: true, isCustom: false },
    { fieldName: 'companyName', label: 'Company Name', type: 'text', required: false, visible: true, isCustom: false },
    { fieldName: 'contactPerson', label: 'Contact Person', type: 'text', required: false, visible: true, isCustom: false },
    { fieldName: 'mobileNumber', label: 'Mobile Number', type: 'text', required: false, visible: true, isCustom: false },
    { fieldName: 'email', label: 'Email Address', type: 'text', required: false, visible: true, isCustom: false },
    { fieldName: 'address', label: 'Address', type: 'textarea', required: false, visible: true, isCustom: false },
    { fieldName: 'city', label: 'City', type: 'text', required: false, visible: true, isCustom: false },
    { fieldName: 'state', label: 'State', type: 'text', required: false, visible: true, isCustom: false },
    { fieldName: 'pinCode', label: 'Pin Code', type: 'text', required: false, visible: true, isCustom: false },
    { fieldName: 'gstNumber', label: 'GST Number', type: 'text', required: false, visible: true, isCustom: false },
    { fieldName: 'panNumber', label: 'PAN Number', type: 'text', required: false, visible: true, isCustom: false },
    { fieldName: 'msmeNumber', label: 'MSME Number', type: 'text', required: false, visible: true, isCustom: false },
    { fieldName: 'vendorCategory', label: 'Vendor Category', type: 'text', required: false, visible: true, isCustom: false },
    { fieldName: 'bankName', label: 'Bank Name', type: 'text', required: false, visible: true, isCustom: false },
    { fieldName: 'bankAccountNumber', label: 'Bank Account Number', type: 'text', required: false, visible: true, isCustom: false },
    { fieldName: 'ifscCode', label: 'IFSC Code', type: 'text', required: false, visible: true, isCustom: false },
    { fieldName: 'paymentTerms', label: 'Payment Terms', type: 'text', required: false, visible: true, isCustom: false }
  ],
  Employee: [
    { fieldName: 'employeeCode', label: 'Employee Code', type: 'text', required: false, visible: true, isCustom: false },
    { fieldName: 'employeeName', label: 'Employee Name', type: 'text', required: true, visible: true, isCustom: false },
    { fieldName: 'mobile', label: 'Mobile Number', type: 'text', required: false, visible: true, isCustom: false },
    { fieldName: 'email', label: 'Email Address', type: 'text', required: false, visible: true, isCustom: false },
    { fieldName: 'joiningDate', label: 'Joining Date', type: 'date', required: false, visible: true, isCustom: false },
    { fieldName: 'BranchId', label: 'Branch', type: 'relation', required: false, visible: true, isCustom: false },
    { fieldName: 'DepartmentId', label: 'Department', type: 'relation', required: false, visible: true, isCustom: false },
    { fieldName: 'DesignationId', label: 'Designation', type: 'relation', required: false, visible: true, isCustom: false },
    { fieldName: 'ReportingManagerId', label: 'Reporting Manager', type: 'relation', required: false, visible: true, isCustom: false },
    { fieldName: 'status', label: 'Status', type: 'select', options: '["Active", "Inactive"]', required: true, visible: true, isCustom: false }
  ],
  Project: [
    { fieldName: 'projectCode', label: 'Project Code', type: 'text', required: false, visible: true, isCustom: false },
    { fieldName: 'projectName', label: 'Project Name', type: 'text', required: true, visible: true, isCustom: false },
    { fieldName: 'CustomerMasterId', label: 'Customer', type: 'relation', required: false, visible: true, isCustom: false },
    { fieldName: 'projectValue', label: 'Project Value', type: 'number', required: false, visible: true, isCustom: false },
    { fieldName: 'startDate', label: 'Start Date', type: 'date', required: false, visible: true, isCustom: false },
    { fieldName: 'endDate', label: 'End Date', type: 'date', required: false, visible: true, isCustom: false },
    { fieldName: 'ProjectManagerId', label: 'Project Manager', type: 'relation', required: false, visible: true, isCustom: false },
    { fieldName: 'status', label: 'Status', type: 'select', options: '["Active", "Completed", "On Hold"]', required: true, visible: true, isCustom: false }
  ],
  Department: [
    { fieldName: 'departmentCode', label: 'Department Code', type: 'text', required: false, visible: true, isCustom: false },
    { fieldName: 'name', label: 'Department Name', type: 'text', required: true, visible: true, isCustom: false }
  ],
  Designation: [
    { fieldName: 'designationCode', label: 'Designation Code', type: 'text', required: false, visible: true, isCustom: false },
    { fieldName: 'name', label: 'Designation Name', type: 'text', required: true, visible: true, isCustom: false }
  ],
  ItemCategory: [
    { fieldName: 'categoryCode', label: 'Category Code', type: 'text', required: false, visible: true, isCustom: false },
    { fieldName: 'name', label: 'Category Name', type: 'text', required: true, visible: true, isCustom: false },
    { fieldName: 'description', label: 'Description', type: 'textarea', required: false, visible: true, isCustom: false },
    { fieldName: 'status', label: 'Status', type: 'select', options: '["Active", "Inactive"]', required: true, visible: true, isCustom: false }
  ],
  Item: [
    { fieldName: 'itemCode', label: 'Item Code', type: 'text', required: false, visible: true, isCustom: false },
    { fieldName: 'name', label: 'Item Name', type: 'text', required: true, visible: true, isCustom: false },
    { fieldName: 'ItemCategoryId', label: 'Category', type: 'relation', required: false, visible: true, isCustom: false },
    { fieldName: 'unit', label: 'Unit', type: 'select', options: '["Nos", "Kgs", "Pcs", "Ltr", "Mtr", "Box", "Set"]', required: false, visible: true, isCustom: false },
    { fieldName: 'purchasePrice', label: 'Purchase Price', type: 'number', required: false, visible: true, isCustom: false },
    { fieldName: 'sellingPrice', label: 'Selling Price', type: 'number', required: false, visible: true, isCustom: false },
    { fieldName: 'gstPercent', label: 'GST %', type: 'number', required: false, visible: true, isCustom: false },
    { fieldName: 'discountPercent', label: 'Discount %', type: 'number', required: false, visible: true, isCustom: false },
    { fieldName: 'hsnSacCode', label: 'HSN/SAC Code', type: 'text', required: false, visible: true, isCustom: false },
    { fieldName: 'description', label: 'Description', type: 'textarea', required: false, visible: true, isCustom: false },
    { fieldName: 'status', label: 'Status', type: 'select', options: '["Active", "Inactive"]', required: true, visible: true, isCustom: false }
  ],
  User: [
    { fieldName: 'employeeCode', label: 'Employee Code', type: 'text', required: false, visible: true, isCustom: false },
    { fieldName: 'name', label: 'Full Name', type: 'text', required: true, visible: true, isCustom: false },
    { fieldName: 'email', label: 'Email Address', type: 'text', required: true, visible: true, isCustom: false },
    { fieldName: 'password', label: 'Login Password', type: 'text', required: true, visible: true, isCustom: false },
    { fieldName: 'role', label: 'Role / Access Level', type: 'select', options: '["Admin", "SalesExecutive", "AccountsUser", "Employee", "Management"]', required: true, visible: true, isCustom: false },
    { fieldName: 'BranchId', label: 'Branch', type: 'relation', required: false, visible: true, isCustom: false },
    { fieldName: 'DepartmentId', label: 'Department', type: 'relation', required: false, visible: true, isCustom: false },
    { fieldName: 'DesignationId', label: 'Designation', type: 'relation', required: false, visible: true, isCustom: false },
    { fieldName: 'mobile', label: 'Mobile Number', type: 'text', required: false, visible: true, isCustom: false },
    { fieldName: 'joiningDate', label: 'Joining Date', type: 'date', required: false, visible: true, isCustom: false },
    { fieldName: 'ReportingManagerId', label: 'Reporting Manager', type: 'relation', required: false, visible: true, isCustom: false },
    { fieldName: 'status', label: 'Status', type: 'select', options: '["Active", "Inactive"]', required: true, visible: true, isCustom: false }
  ],
  Branch: [
    { fieldName: 'branchCode', label: 'Branch Code', type: 'text', required: false, visible: true, isCustom: false },
    { fieldName: 'name', label: 'Branch Name', type: 'text', required: true, visible: true, isCustom: false },
    { fieldName: 'address', label: 'Branch Address', type: 'textarea', required: false, visible: true, isCustom: false },
    { fieldName: 'status', label: 'Status', type: 'select', options: '["Active", "Inactive"]', required: true, visible: true, isCustom: false }
  ],
  ERP: [
    { fieldName: 'financialYear', label: 'Financial Year (e.g. 2026-2027)', type: 'text', required: true, visible: true, isCustom: false },
    { fieldName: 'gstNumber', label: 'GSTIN / Tax Registration Number', type: 'text', required: false, visible: true, isCustom: false },
    { fieldName: 'taxRate', label: 'Standard GST / Tax Rate (%)', type: 'number', required: true, visible: true, isCustom: false },
    { fieldName: 'currency', label: 'Base Currency (e.g. INR, USD)', type: 'text', required: true, visible: true, isCustom: false }
  ],
  Unit: [
    { fieldName: 'unitCode', label: 'Unit Code', type: 'text', required: false, visible: true, isCustom: false },
    { fieldName: 'name', label: 'Unit Name', type: 'text', required: true, visible: true, isCustom: false },
    { fieldName: 'status', label: 'Status', type: 'select', options: '["Active", "Inactive"]', required: true, visible: true, isCustom: false }
  ],
  ExpenseCategory: [
    { fieldName: 'categoryCode', label: 'Category Code', type: 'text', required: false, visible: true, isCustom: false },
    { fieldName: 'name', label: 'Category Name', type: 'text', required: true, visible: true, isCustom: false },
    { fieldName: 'description', label: 'Description', type: 'textarea', required: false, visible: true, isCustom: false },
    { fieldName: 'approvalRequired', label: 'Approval Required', type: 'checkbox', required: false, visible: true, isCustom: false },
    { fieldName: 'status', label: 'Status', type: 'select', options: '["Active", "Inactive"]', required: true, visible: true, isCustom: false }
  ],
  Warehouse: [
    { fieldName: 'warehouseCode', label: 'Warehouse Code', type: 'text', required: true, visible: true, isCustom: false },
    { fieldName: 'name', label: 'Warehouse Name', type: 'text', required: true, visible: true, isCustom: false },
    { fieldName: 'warehouseType', label: 'Warehouse Type', type: 'select', options: '["Main", "Branch", "Transit", "Distribution Center", "Store"]', required: true, visible: true, isCustom: false },
    { fieldName: 'BranchId', label: 'Branch', type: 'relation', required: true, visible: true, isCustom: false },
    { fieldName: 'ManagerId', label: 'Manager', type: 'relation', required: false, visible: true, isCustom: false },
    { fieldName: 'contactPerson', label: 'Contact Person', type: 'text', required: false, visible: true, isCustom: false },
    { fieldName: 'mobileNumber', label: 'Mobile Number', type: 'text', required: false, visible: true, isCustom: false },
    { fieldName: 'email', label: 'Email', type: 'text', required: false, visible: true, isCustom: false },
    { fieldName: 'country', label: 'Country', type: 'select', options: '["India", "United States", "United Kingdom", "United Arab Emirates", "Singapore"]', required: true, visible: true, isCustom: false },
    { fieldName: 'state', label: 'State', type: 'text', required: true, visible: true, isCustom: false },
    { fieldName: 'city', label: 'City', type: 'text', required: true, visible: true, isCustom: false },
    { fieldName: 'pincode', label: 'Pincode', type: 'text', required: false, visible: true, isCustom: false },
    { fieldName: 'addressLine1', label: 'Address Line 1', type: 'textarea', required: true, visible: true, isCustom: false },
    { fieldName: 'addressLine2', label: 'Address Line 2', type: 'textarea', required: false, visible: true, isCustom: false },
    { fieldName: 'latitude', label: 'Latitude', type: 'number', required: false, visible: true, isCustom: false },
    { fieldName: 'longitude', label: 'Longitude', type: 'number', required: false, visible: true, isCustom: false },
    { fieldName: 'storageCapacity', label: 'Storage Capacity', type: 'number', required: false, visible: true, isCustom: false },
    { fieldName: 'capacityUnit', label: 'Capacity Unit', type: 'select', options: '["Sq.ft", "Cubic Meter", "Pallets"]', required: false, visible: true, isCustom: false },
    { fieldName: 'defaultWarehouse', label: 'Default Warehouse', type: 'checkbox', required: false, visible: true, isCustom: false },
    { fieldName: 'allowNegativeStock', label: 'Allow Negative Stock', type: 'checkbox', required: false, visible: true, isCustom: false },
    { fieldName: 'status', label: 'Status', type: 'select', options: '["Active", "Inactive"]', required: true, visible: true, isCustom: false },
    { fieldName: 'notes', label: 'Notes', type: 'textarea', required: false, visible: true, isCustom: false }
  ],
  Location: [
    { fieldName: 'locationCode', label: 'Location Code', type: 'text', required: true, visible: true, isCustom: false },
    { fieldName: 'name', label: 'Location Name', type: 'text', required: true, visible: true, isCustom: false },
    { fieldName: 'WarehouseId', label: 'Warehouse', type: 'relation', required: true, visible: true, isCustom: false },
    { fieldName: 'zone', label: 'Zone', type: 'select', options: '["Zone A", "Zone B", "Zone C"]', required: false, visible: true, isCustom: false },
    { fieldName: 'aisle', label: 'Aisle', type: 'text', required: false, visible: true, isCustom: false },
    { fieldName: 'rack', label: 'Rack', type: 'text', required: false, visible: true, isCustom: false },
    { fieldName: 'shelf', label: 'Shelf', type: 'text', required: false, visible: true, isCustom: false },
    { fieldName: 'bin', label: 'Bin', type: 'text', required: false, visible: true, isCustom: false },
    { fieldName: 'locationType', label: 'Location Type', type: 'select', options: '["Storage", "Receiving", "Dispatch", "Returns", "Damage", "QC", "Transit"]', required: true, visible: true, isCustom: false },
    { fieldName: 'capacity', label: 'Capacity', type: 'number', required: false, visible: true, isCustom: false },
    { fieldName: 'capacityUnit', label: 'Capacity Unit', type: 'select', options: '["Pieces", "Boxes", "Pallets"]', required: false, visible: true, isCustom: false },
    { fieldName: 'barcode', label: 'Barcode', type: 'text', required: false, visible: true, isCustom: false },
    { fieldName: 'allowMixedItems', label: 'Allow Mixed Items', type: 'checkbox', required: false, visible: true, isCustom: false },
    { fieldName: 'tempControlled', label: 'Temperature Controlled', type: 'checkbox', required: false, visible: true, isCustom: false },
    { fieldName: 'hazardousStorage', label: 'Hazardous Storage', type: 'checkbox', required: false, visible: true, isCustom: false },
    { fieldName: 'pickSequence', label: 'Pick Sequence', type: 'number', required: false, visible: true, isCustom: false },
    { fieldName: 'putawaySequence', label: 'Putaway Sequence', type: 'number', required: false, visible: true, isCustom: false },
    { fieldName: 'status', label: 'Status', type: 'select', options: '["Active", "Inactive"]', required: true, visible: true, isCustom: false },
    { fieldName: 'remarks', label: 'Remarks', type: 'textarea', required: false, visible: true, isCustom: false }
  ],
  ServiceCategory: [
    { fieldName: 'categoryCode', label: 'Category Code', type: 'text', required: true, visible: true, isCustom: false },
    { fieldName: 'name', label: 'Category Name', type: 'text', required: true, visible: true, isCustom: false },
    { fieldName: 'ParentId', label: 'Parent Category', type: 'relation', required: false, visible: true, isCustom: false },
    { fieldName: 'description', label: 'Description', type: 'textarea', required: false, visible: true, isCustom: false },
    { fieldName: 'status', label: 'Status', type: 'select', options: '["Active", "Inactive"]', required: true, visible: true, isCustom: false }
  ],
  AmcCategory: [
    { fieldName: 'categoryCode', label: 'AMC Category Code', type: 'text', required: false, visible: true, isCustom: false },
    { fieldName: 'name', label: 'AMC Category Name', type: 'text', required: true, visible: true, isCustom: false },
    { fieldName: 'description', label: 'Description', type: 'textarea', required: false, visible: true, isCustom: false },
    { fieldName: 'defaultDuration', label: 'Default Duration', type: 'text', required: false, visible: true, isCustom: false },
    { fieldName: 'status', label: 'Status', type: 'select', options: '["Active", "Inactive"]', required: true, visible: true, isCustom: false }
  ],
  Vehicle: [
    { fieldName: 'vehicleCode', label: 'Vehicle Code', type: 'text', required: true, visible: true, isCustom: false },
    { fieldName: 'vehicleNumber', label: 'Vehicle Number (Registration No.)', type: 'text', required: true, visible: true, isCustom: false },
    { fieldName: 'vehicleName', label: 'Vehicle Name/Nickname', type: 'text', required: false, visible: true, isCustom: false },
    { fieldName: 'vehicleType', label: 'Vehicle Type', type: 'select', options: '["Car", "Bike", "Truck", "Van", "Bus", "Tempo", "Other"]', required: true, visible: true, isCustom: false },
    { fieldName: 'brand', label: 'Brand/Manufacturer', type: 'select', options: '["Tata", "Mahindra", "Maruti Suzuki", "Hyundai", "Honda", "Toyota", "Ashok Leyland", "Bajaj", "Other"]', required: false, visible: true, isCustom: false },
    { fieldName: 'model', label: 'Model', type: 'text', required: false, visible: true, isCustom: false },
    { fieldName: 'fuelType', label: 'Fuel Type', type: 'select', options: '["Petrol", "Diesel", "CNG", "Electric", "Hybrid", "Other"]', required: true, visible: true, isCustom: false },
    { fieldName: 'color', label: 'Color', type: 'text', required: false, visible: true, isCustom: false },
    { fieldName: 'chassisNumber', label: 'Chassis Number', type: 'text', required: false, visible: true, isCustom: false },
    { fieldName: 'engineNumber', label: 'Engine Number', type: 'text', required: false, visible: true, isCustom: false },
    { fieldName: 'manufacturingYear', label: 'Manufacturing Year', type: 'number', required: false, visible: true, isCustom: false },
    { fieldName: 'CompanyId', label: 'Company', type: 'relation', required: true, visible: true, isCustom: false },
    { fieldName: 'BranchId', label: 'Branch', type: 'relation', required: false, visible: true, isCustom: false },
    { fieldName: 'AssignedDriverId', label: 'Assigned Driver', type: 'relation', required: false, visible: true, isCustom: false },
    { fieldName: 'status', label: 'Status', type: 'select', options: '["Active", "Inactive", "Under Maintenance"]', required: true, visible: true, isCustom: false },
    { fieldName: 'remarks', label: 'Remarks', type: 'textarea', required: false, visible: true, isCustom: false },
    { fieldName: 'createdBy', label: 'Created By', type: 'text', required: true, visible: true, isCustom: false },
    { fieldName: 'createdAt', label: 'Created Date', type: 'date', required: true, visible: true, isCustom: false },
    { fieldName: 'updatedBy', label: 'Updated By', type: 'text', required: false, visible: true, isCustom: false },
    { fieldName: 'updatedAt', label: 'Updated Date', type: 'date', required: false, visible: true, isCustom: false }
  ],
  Asset: [
    { fieldName: 'assetCode', label: 'Asset Code', type: 'text', required: true, visible: true, isCustom: false },
    { fieldName: 'assetName', label: 'Asset Name', type: 'text', required: true, visible: true, isCustom: false },
    { fieldName: 'assetCategory', label: 'Asset Category', type: 'select', options: '["IT Equipment", "Furniture & Fixtures", "Office Equipment", "Machinery", "Vehicle", "Other"]', required: true, visible: true, isCustom: false },
    { fieldName: 'brand', label: 'Brand', type: 'select', options: '["HP", "Dell", "Lenovo", "Apple", "Samsung", "Godrej", "Sony", "Other"]', required: false, visible: true, isCustom: false },
    { fieldName: 'model', label: 'Model', type: 'text', required: false, visible: true, isCustom: false },
    { fieldName: 'serialNumber', label: 'Serial Number', type: 'text', required: false, visible: true, isCustom: false },
    { fieldName: 'CompanyId', label: 'Company', type: 'relation', required: true, visible: true, isCustom: false },
    { fieldName: 'BranchId', label: 'Branch', type: 'relation', required: false, visible: true, isCustom: false },
    { fieldName: 'DepartmentId', label: 'Department', type: 'relation', required: false, visible: true, isCustom: false },
    { fieldName: 'AssignedEmployeeId', label: 'Assigned To', type: 'relation', required: false, visible: true, isCustom: false },
    { fieldName: 'purchaseDate', label: 'Purchase Date', type: 'date', required: false, visible: true, isCustom: false },
    { fieldName: 'purchaseCost', label: 'Purchase Cost', type: 'number', required: false, visible: true, isCustom: false },
    { fieldName: 'VendorId', label: 'Vendor', type: 'relation', required: false, visible: true, isCustom: false },
    { fieldName: 'warrantyExpiry', label: 'Warranty Expiry', type: 'date', required: false, visible: true, isCustom: false },
    { fieldName: 'LocationId', label: 'Location', type: 'relation', required: false, visible: true, isCustom: false },
    { fieldName: 'assetStatus', label: 'Asset Status', type: 'select', options: '["Active", "Under Maintenance", "Disposed", "Lost", "Inactive"]', required: true, visible: true, isCustom: false },
    { fieldName: 'description', label: 'Description', type: 'textarea', required: false, visible: true, isCustom: false },
    { fieldName: 'createdBy', label: 'Created By', type: 'text', required: true, visible: true, isCustom: false },
    { fieldName: 'createdAt', label: 'Created Date', type: 'date', required: true, visible: true, isCustom: false },
    { fieldName: 'updatedBy', label: 'Updated By', type: 'text', required: false, visible: true, isCustom: false },
    { fieldName: 'updatedAt', label: 'Updated Date', type: 'date', required: false, visible: true, isCustom: false }
  ],
  Lead: [
    { fieldName: 'leadCode', label: 'Lead Code', type: 'text', required: false, visible: true, isCustom: false },
    { fieldName: 'leadTitle', label: 'Lead Title', type: 'text', required: true, visible: true, isCustom: false },
    { fieldName: 'companyName', label: 'Company Name', type: 'text', required: false, visible: true, isCustom: false },
    { fieldName: 'contactName', label: 'Contact Name', type: 'text', required: true, visible: true, isCustom: false },
    { fieldName: 'email', label: 'Email Address', type: 'text', required: false, visible: true, isCustom: false },
    { fieldName: 'phone', label: 'Phone Number', type: 'text', required: false, visible: true, isCustom: false },
    { fieldName: 'leadSource', label: 'Lead Source', type: 'select', options: '["Website", "Cold Call", "Referral", "Social Media", "Exhibition", "Direct", "Other"]', required: false, visible: true, isCustom: false },
    { fieldName: 'leadStatus', label: 'Lead Status', type: 'select', options: '["New", "Contacted", "Qualified", "Proposal Sent", "Negotiation", "Converted", "Lost"]', required: true, visible: true, isCustom: false },
    { fieldName: 'estimatedValue', label: 'Estimated Value', type: 'number', required: false, visible: true, isCustom: false },
    { fieldName: 'AssignedToId', label: 'Assigned To', type: 'relation', required: false, visible: true, isCustom: false },
    { fieldName: 'nextFollowUpDate', label: 'Next Follow-up Date', type: 'date', required: false, visible: true, isCustom: false },
    { fieldName: 'description', label: 'Description', type: 'textarea', required: false, visible: true, isCustom: false },
    { fieldName: 'activityType', label: 'Activity Type', type: 'select', options: '["Note", "Call", "Meeting", "Task"]', required: true, visible: false, isCustom: false }
  ],
  Enquiry: [
    { fieldName: 'enquiryNumber', label: 'Enquiry Number', type: 'text', required: false, visible: true, isCustom: false },
    { fieldName: 'enquiryDate', label: 'Enquiry Date', type: 'date', required: true, visible: true, isCustom: false },
    { fieldName: 'CustomerMasterId', label: 'Customer', type: 'relation', required: true, visible: true, isCustom: false },
    { fieldName: 'contactName', label: 'Contact Person', type: 'text', required: false, visible: true, isCustom: false },
    { fieldName: 'productService', label: 'Product / Service', type: 'text', required: false, visible: true, isCustom: false },
    { fieldName: 'quantity', label: 'Quantity', type: 'number', required: false, visible: true, isCustom: false },
    { fieldName: 'expectedClosingDate', label: 'Expected Closing Date', type: 'date', required: false, visible: true, isCustom: false },
    { fieldName: 'AssignedToId', label: 'Assigned To', type: 'relation', required: false, visible: true, isCustom: false },
    { fieldName: 'status', label: 'Enquiry Status', type: 'select', options: '["New", "Follow Up", "Quotation Sent", "Won", "Lost"]', required: true, visible: true, isCustom: false },
    { fieldName: 'estimatedValue', label: 'Estimated Value', type: 'number', required: false, visible: true, isCustom: false },
    { fieldName: 'details', label: 'Requirement Details', type: 'textarea', required: false, visible: true, isCustom: false },
    { fieldName: 'activityType', label: 'Activity Type', type: 'select', options: '["Note", "Call", "Meeting", "Task"]', required: true, visible: false, isCustom: false }
  ],
  Quotation: [
    { fieldName: 'quotationNumber', label: 'Quotation Number', type: 'text', required: false, visible: true, isCustom: false },
    { fieldName: 'date', label: 'Quotation Date', type: 'date', required: true, visible: true, isCustom: false },
    { fieldName: 'CustomerMasterId', label: 'Customer', type: 'relation', required: true, visible: true, isCustom: false },
    { fieldName: 'clientName', label: 'Client / Company Name', type: 'text', required: false, visible: true, isCustom: false },
    { fieldName: 'validityDate', label: 'Validity Date', type: 'date', required: false, visible: true, isCustom: false },
    { fieldName: 'EnquiryId', label: 'Linked Enquiry', type: 'relation', required: false, visible: true, isCustom: false },
    { fieldName: 'status', label: 'Quotation Status', type: 'select', options: '["Draft", "Sent", "Accepted", "Rejected"]', required: true, visible: true, isCustom: false },
    { fieldName: 'termsConditions', label: 'Terms & Conditions', type: 'textarea', required: false, visible: true, isCustom: false },
    { fieldName: 'remarks', label: 'Remarks', type: 'textarea', required: false, visible: true, isCustom: false }
  ],
  SalesOrder: [
    { fieldName: 'soNumber', label: 'Sales Order Number', type: 'text', required: false, visible: true, isCustom: false },
    { fieldName: 'soDate', label: 'Sales Order Date', type: 'date', required: true, visible: true, isCustom: false },
    { fieldName: 'CustomerMasterId', label: 'Customer', type: 'relation', required: true, visible: true, isCustom: false },
    { fieldName: 'CustomerPurchaseOrderId', label: 'Customer PO', type: 'relation', required: false, visible: true, isCustom: false },
    { fieldName: 'QuotationId', label: 'Linked Quotation', type: 'relation', required: false, visible: true, isCustom: false },
    { fieldName: 'status', label: 'Status', type: 'select', options: '["Draft", "Pending Approval", "Approved", "Dispatched", "Closed", "Cancelled"]', required: true, visible: true, isCustom: false },
    { fieldName: 'remarks', label: 'Remarks', type: 'textarea', required: false, visible: true, isCustom: false }
  ],
  CustomerPO: [
    { fieldName: 'poNumber', label: 'PO Number', type: 'text', required: true, visible: true, isCustom: false },
    { fieldName: 'poDate', label: 'PO Date', type: 'date', required: true, visible: true, isCustom: false },
    { fieldName: 'CustomerMasterId', label: 'Customer', type: 'relation', required: true, visible: true, isCustom: false },
    { fieldName: 'poAmount', label: 'PO Amount', type: 'number', required: false, visible: true, isCustom: false },
    { fieldName: 'status', label: 'Status', type: 'select', options: '["Active", "Closed", "Cancelled"]', required: true, visible: true, isCustom: false },
    { fieldName: 'remarks', label: 'Remarks', type: 'textarea', required: false, visible: true, isCustom: false }
  ],
  DispatchPlan: [
    { fieldName: 'dispatchNo', label: 'Dispatch Plan No', type: 'text', required: false, visible: true, isCustom: false },
    { fieldName: 'plannedDate', label: 'Planned Date', type: 'date', required: true, visible: true, isCustom: false },
    { fieldName: 'SalesOrderId', label: 'Sales Order', type: 'relation', required: true, visible: true, isCustom: false },
    { fieldName: 'WarehouseId', label: 'Warehouse', type: 'relation', required: false, visible: true, isCustom: false },
    { fieldName: 'status', label: 'Status', type: 'select', options: '["Scheduled", "Dispatched", "Cancelled"]', required: true, visible: true, isCustom: false },
    { fieldName: 'remarks', label: 'Remarks', type: 'textarea', required: false, visible: true, isCustom: false }
  ],
  DeliveryTracking: [
    { fieldName: 'trackingNo', label: 'Tracking Number', type: 'text', required: false, visible: true, isCustom: false },
    { fieldName: 'courierPartner', label: 'Courier/Carrier', type: 'text', required: false, visible: true, isCustom: false },
    { fieldName: 'shippedDate', label: 'Shipped Date', type: 'date', required: false, visible: true, isCustom: false },
    { fieldName: 'deliveryStatus', label: 'Delivery Status', type: 'select', options: '["Pending", "In Transit", "Delivered", "Returned", "Cancelled"]', required: true, visible: true, isCustom: false },
    { fieldName: 'actualDeliveryDate', label: 'Actual Delivery Date', type: 'date', required: false, visible: true, isCustom: false },
    { fieldName: 'DispatchPlanId', label: 'Dispatch Plan', type: 'relation', required: true, visible: true, isCustom: false },
    { fieldName: 'VehicleId', label: 'Vehicle', type: 'relation', required: false, visible: true, isCustom: false },
    { fieldName: 'remarks', label: 'Remarks', type: 'textarea', required: false, visible: true, isCustom: false }
  ],
  Invoice: [
    { fieldName: 'invoiceNumber', label: 'Invoice Number', type: 'text', required: false, visible: true, isCustom: false },
    { fieldName: 'invoiceDate', label: 'Invoice Date', type: 'date', required: true, visible: true, isCustom: false },
    { fieldName: 'SalesOrderId', label: 'Sales Order', type: 'relation', required: false, visible: true, isCustom: false },
    { fieldName: 'dueDate', label: 'Due Date', type: 'date', required: false, visible: true, isCustom: false },
    { fieldName: 'amountPaid', label: 'Amount Paid', type: 'number', required: false, visible: true, isCustom: false },
    { fieldName: 'paymentStatus', label: 'Payment Status', type: 'select', options: '["Unpaid", "Partially Paid", "Paid"]', required: true, visible: true, isCustom: false },
    { fieldName: 'remarks', label: 'Remarks', type: 'textarea', required: false, visible: true, isCustom: false }
  ],
  CreditNote: [
    { fieldName: 'creditNoteNumber', label: 'Credit Note Number', type: 'text', required: false, visible: true, isCustom: false },
    { fieldName: 'date', label: 'Date', type: 'date', required: true, visible: true, isCustom: false },
    { fieldName: 'InvoiceId', label: 'Invoice', type: 'relation', required: true, visible: true, isCustom: false },
    { fieldName: 'amount', label: 'Amount', type: 'number', required: true, visible: true, isCustom: false },
    { fieldName: 'reason', label: 'Reason', type: 'textarea', required: false, visible: true, isCustom: false }
  ],
  DebitNote: [
    { fieldName: 'debitNoteNumber', label: 'Debit Note Number', type: 'text', required: false, visible: true, isCustom: false },
    { fieldName: 'date', label: 'Date', type: 'date', required: true, visible: true, isCustom: false },
    { fieldName: 'InvoiceId', label: 'Invoice', type: 'relation', required: true, visible: true, isCustom: false },
    { fieldName: 'amount', label: 'Amount', type: 'number', required: true, visible: true, isCustom: false },
    { fieldName: 'reason', label: 'Reason', type: 'textarea', required: false, visible: true, isCustom: false }
  ],
  SalesReturn: [
    { fieldName: 'returnNumber', label: 'Return Number', type: 'text', required: false, visible: true, isCustom: false },
    { fieldName: 'returnDate', label: 'Return Date', type: 'date', required: true, visible: true, isCustom: false },
    { fieldName: 'InvoiceId', label: 'Invoice', type: 'relation', required: true, visible: true, isCustom: false },
    { fieldName: 'CreditNoteId', label: 'Credit Note', type: 'relation', required: false, visible: true, isCustom: false },
    { fieldName: 'remarks', label: 'Remarks', type: 'textarea', required: false, visible: true, isCustom: false }
  ],

  // Purchase Management Modules (Vendor Management)
  VendorEnquiry: [
    { fieldName: 'enquiryNumber', label: 'Enquiry Number', type: 'text', required: false, visible: true, isCustom: false },
    { fieldName: 'enquiryDate', label: 'Enquiry Date', type: 'date', required: true, visible: true, isCustom: false },
    { fieldName: 'VendorId', label: 'Vendor', type: 'relation', required: true, visible: true, isCustom: false },
    { fieldName: 'contactPerson', label: 'Contact Person', type: 'text', required: false, visible: true, isCustom: false },
    { fieldName: 'mobileNumber', label: 'Mobile Number', type: 'text', required: false, visible: true, isCustom: false },
    { fieldName: 'email', label: 'Email', type: 'text', required: false, visible: true, isCustom: false },
    { fieldName: 'productService', label: 'Product/Service', type: 'text', required: false, visible: true, isCustom: false },
    { fieldName: 'quantity', label: 'Quantity', type: 'number', required: false, visible: true, isCustom: false },
    { fieldName: 'expectedClosingDate', label: 'Expected Closing Date', type: 'date', required: false, visible: true, isCustom: false },
    { fieldName: 'AssignedToId', label: 'Assigned To', type: 'relation', required: false, visible: true, isCustom: false },
    { fieldName: 'priority', label: 'Priority', type: 'select', options: '["Low", "Medium", "High"]', required: false, visible: true, isCustom: false },
    { fieldName: 'status', label: 'Status', type: 'select', options: '["New", "Follow Up", "Quotation Requested", "Quotation Received", "Won", "Lost"]', required: true, visible: true, isCustom: false },
    { fieldName: 'estimatedValue', label: 'Estimated Value', type: 'number', required: false, visible: true, isCustom: false },
    { fieldName: 'details', label: 'Details', type: 'textarea', required: false, visible: true, isCustom: false }
  ],
  VendorQuotation: [
    { fieldName: 'quotationNumber', label: 'Quotation Number', type: 'text', required: false, visible: true, isCustom: false },
    { fieldName: 'quotationDate', label: 'Quotation Date', type: 'date', required: true, visible: true, isCustom: false },
    { fieldName: 'VendorId', label: 'Vendor', type: 'relation', required: true, visible: true, isCustom: false },
    { fieldName: 'VendorEnquiryId', label: 'Linked Enquiry', type: 'relation', required: false, visible: true, isCustom: false },
    { fieldName: 'validityDate', label: 'Validity Date', type: 'date', required: false, visible: true, isCustom: false },
    { fieldName: 'status', label: 'Status', type: 'select', options: '["Draft", "Sent", "Received", "Accepted", "Rejected", "Expired"]', required: true, visible: true, isCustom: false },
    { fieldName: 'termsConditions', label: 'Terms & Conditions', type: 'textarea', required: false, visible: true, isCustom: false },
    { fieldName: 'remarks', label: 'Remarks', type: 'textarea', required: false, visible: true, isCustom: false },
    { fieldName: 'totalAmount', label: 'Total Amount', type: 'number', required: true, visible: true, isCustom: false, defaultValue: 0 }
  ],
  PurchaseRequisition: [
    { fieldName: 'requisitionNumber', label: 'Requisition Number', type: 'text', required: false, visible: true, isCustom: false },
    { fieldName: 'requisitionDate', label: 'Requisition Date', type: 'date', required: true, visible: true, isCustom: false },
    { fieldName: 'RequestedById', label: 'Requested By', type: 'relation', required: true, visible: true, isCustom: false },
    { fieldName: 'DepartmentId', label: 'Department', type: 'relation', required: false, visible: true, isCustom: false },
    { fieldName: 'WarehouseId', label: 'Warehouse', type: 'relation', required: false, visible: true, isCustom: false },
    { fieldName: 'requiredDate', label: 'Required Date', type: 'date', required: false, visible: true, isCustom: false },
    { fieldName: 'priority', label: 'Priority', type: 'select', options: '["Low", "Medium", "High", "Urgent"]', required: true, visible: true, isCustom: false, defaultValue: 'Medium' },
    { fieldName: 'status', label: 'Status', type: 'select', options: '["Draft", "Submitted", "Approved", "Rejected", "Converted to PO"]', required: true, visible: true, isCustom: false },
    { fieldName: 'items', label: 'Items', type: 'json', required: true, visible: true, isCustom: false },
    { fieldName: 'remarks', label: 'Remarks', type: 'textarea', required: false, visible: true, isCustom: false }
  ],
  PurchaseApproval: [
    { fieldName: 'approvalCode', label: 'Approval Code', type: 'text', required: false, visible: true, isCustom: false },
    { fieldName: 'module', label: 'Module', type: 'select', options: '["PurchaseRequisition", "PurchaseOrder", "VendorBill", "VendorPayment"]', required: true, visible: true, isCustom: false },
    { fieldName: 'referenceId', label: 'Reference ID', type: 'text', required: true, visible: true, isCustom: false },
    { fieldName: 'referenceType', label: 'Reference Type', type: 'text', required: true, visible: true, isCustom: false },
    { fieldName: 'currentLevel', label: 'Current Level', type: 'number', required: true, visible: true, isCustom: false, defaultValue: 1 },
    { fieldName: 'totalLevels', label: 'Total Levels', type: 'number', required: true, visible: true, isCustom: false, defaultValue: 1 },
    { fieldName: 'status', label: 'Status', type: 'select', options: '["Pending", "Approved", "Rejected", "Escalated"]', required: true, visible: true, isCustom: false },
    { fieldName: 'approvers', label: 'Approvers', type: 'json', required: true, visible: true, isCustom: false },
    { fieldName: 'initiatedBy', label: 'Initiated By', type: 'relation', required: true, visible: true, isCustom: false },
    { fieldName: 'decision', label: 'Decision', type: 'select', options: '["", "Approved", "Rejected"]', required: false, visible: true, isCustom: false },
    { fieldName: 'comments', label: 'Comments', type: 'textarea', required: false, visible: true, isCustom: false }
  ],
  PurchaseOrder: [
    { fieldName: 'poNumber', label: 'PO Number', type: 'text', required: false, visible: true, isCustom: false },
    { fieldName: 'poDate', label: 'PO Date', type: 'date', required: true, visible: true, isCustom: false },
    { fieldName: 'VendorId', label: 'Vendor', type: 'relation', required: true, visible: true, isCustom: false },
    { fieldName: 'CustomerId', label: 'Customer', type: 'relation', required: false, visible: true, isCustom: false },
    { fieldName: 'VendorQuotationId', label: 'Vendor Quotation', type: 'relation', required: false, visible: true, isCustom: false },
    { fieldName: 'PurchaseRequisitionId', label: 'Purchase Requisition', type: 'relation', required: false, visible: true, isCustom: false },
    { fieldName: 'WarehouseId', label: 'Warehouse', type: 'relation', required: false, visible: true, isCustom: false },
    { fieldName: 'expectedDate', label: 'Expected Delivery', type: 'date', required: false, visible: true, isCustom: false },
    { fieldName: 'paymentTerms', label: 'Payment Terms', type: 'text', required: false, visible: true, isCustom: false },
    { fieldName: 'status', label: 'Status', type: 'select', options: '["Draft", "Pending Approval", "Pending", "Approved", "Processing", "Completed", "Cancelled"]', required: true, visible: true, isCustom: false },
    { fieldName: 'items', label: 'Items', type: 'json', required: true, visible: true, isCustom: false },
    { fieldName: 'totalAmount', label: 'Total Amount', type: 'number', required: true, visible: true, isCustom: false, defaultValue: 0 },
    { fieldName: 'remarks', label: 'Remarks', type: 'textarea', required: false, visible: true, isCustom: false }
  ],
  GoodsReceiptNote: [
    { fieldName: 'grnNumber', label: 'GRN Number', type: 'text', required: false, visible: true, isCustom: false },
    { fieldName: 'grnDate', label: 'GRN Date', type: 'date', required: true, visible: true, isCustom: false },
    { fieldName: 'PurchaseOrderId', label: 'Purchase Order', type: 'relation', required: true, visible: true, isCustom: false },
    { fieldName: 'WarehouseId', label: 'Warehouse', type: 'relation', required: true, visible: true, isCustom: false },
    { fieldName: 'VendorId', label: 'Vendor', type: 'relation', required: true, visible: true, isCustom: false },
    { fieldName: 'challanNumber', label: 'Challan Number', type: 'text', required: false, visible: true, isCustom: false },
    { fieldName: 'challanDate', label: 'Challan Date', type: 'date', required: false, visible: true, isCustom: false },
    { fieldName: 'transporter', label: 'Transporter', type: 'text', required: false, visible: true, isCustom: false },
    { fieldName: 'vehicleNo', label: 'Vehicle No', type: 'text', required: false, visible: true, isCustom: false },
    { fieldName: 'status', label: 'Status', type: 'select', options: '["Scheduled", "Received", "Partial", "Quality Check", "Accepted", "Rejected", "Cancelled"]', required: true, visible: true, isCustom: false },
    { fieldName: 'items', label: 'Items', type: 'json', required: true, visible: true, isCustom: false },
    { fieldName: 'remarks', label: 'Remarks', type: 'textarea', required: false, visible: true, isCustom: false }
  ],
  VendorBill: [
    { fieldName: 'billNumber', label: 'Bill Number', type: 'text', required: false, visible: true, isCustom: false },
    { fieldName: 'billDate', label: 'Bill Date', type: 'date', required: true, visible: true, isCustom: false },
    { fieldName: 'VendorId', label: 'Vendor', type: 'relation', required: true, visible: true, isCustom: false },
    { fieldName: 'PurchaseOrderId', label: 'Purchase Order', type: 'relation', required: false, visible: true, isCustom: false },
    { fieldName: 'GRNId', label: 'GRN', type: 'relation', required: false, visible: true, isCustom: false },
    { fieldName: 'dueDate', label: 'Due Date', type: 'date', required: false, visible: true, isCustom: false },
    { fieldName: 'billAmount', label: 'Bill Amount', type: 'number', required: true, visible: true, isCustom: false, defaultValue: 0 },
    { fieldName: 'taxAmount', label: 'Tax Amount', type: 'number', required: false, visible: true, isCustom: false, defaultValue: 0 },
    { fieldName: 'totalAmount', label: 'Total Amount', type: 'number', required: true, visible: true, isCustom: false, defaultValue: 0 },
    { fieldName: 'status', label: 'Status', type: 'select', options: '["Pending", "Verified", "Approved", "Paid", "Partially Paid", "Disputed", "Cancelled"]', required: true, visible: true, isCustom: false },
    { fieldName: 'paymentStatus', label: 'Payment Status', type: 'select', options: '["Unpaid", "Partially Paid", "Paid"]', required: true, visible: true, isCustom: false, defaultValue: 'Unpaid' },
    { fieldName: 'remarks', label: 'Remarks', type: 'textarea', required: false, visible: true, isCustom: false }
  ],
  VendorPayment: [
    { fieldName: 'paymentNumber', label: 'Payment Number', type: 'text', required: false, visible: true, isCustom: false },
    { fieldName: 'paymentDate', label: 'Payment Date', type: 'date', required: true, visible: true, isCustom: false },
    { fieldName: 'VendorId', label: 'Vendor', type: 'relation', required: true, visible: true, isCustom: false },
    { fieldName: 'VendorBillId', label: 'Vendor Bill', type: 'relation', required: false, visible: true, isCustom: false },
    { fieldName: 'amount', label: 'Amount', type: 'number', required: true, visible: true, isCustom: false, defaultValue: 0 },
    { fieldName: 'mode', label: 'Payment Mode', type: 'select', options: '["Cash", "Bank Transfer", "Cheque", "UPI", "Card", "Other"]', required: true, visible: true, isCustom: false },
    { fieldName: 'referenceNumber', label: 'Reference Number', type: 'text', required: false, visible: true, isCustom: false },
    { fieldName: 'bankName', label: 'Bank Name', type: 'text', required: false, visible: true, isCustom: false },
    { fieldName: 'chequeDate', label: 'Cheque Date', type: 'date', required: false, visible: true, isCustom: false },
    { fieldName: 'clearingDate', label: 'Clearing Date', type: 'date', required: false, visible: true, isCustom: false },
    { fieldName: 'status', label: 'Status', type: 'select', options: '["Pending", "Processing", "Completed", "Failed", "Cancelled"]', required: true, visible: true, isCustom: false },
    { fieldName: 'remarks', label: 'Remarks', type: 'textarea', required: false, visible: true, isCustom: false }
  ],
  StockInward: [
    { fieldName: 'WarehouseId', label: 'Warehouse', type: 'relation', required: true, visible: true, isCustom: false },
    { fieldName: 'ItemId', label: 'Item', type: 'relation', required: true, visible: true, isCustom: false },
    { fieldName: 'quantity', label: 'Quantity', type: 'number', required: true, visible: true, isCustom: false },
    { fieldName: 'referenceId', label: 'Reference ID', type: 'text', required: false, visible: true, isCustom: false },
    { fieldName: 'batchNumber', label: 'Batch Number', type: 'text', required: false, visible: true, isCustom: false },
    { fieldName: 'lotNumber', label: 'Lot Number', type: 'text', required: false, visible: true, isCustom: false },
    { fieldName: 'serialNumber', label: 'Serial Number', type: 'text', required: false, visible: true, isCustom: false },
    { fieldName: 'expiryDate', label: 'Expiry Date', type: 'date', required: false, visible: true, isCustom: false }
  ],
  StockOutward: [
    { fieldName: 'WarehouseId', label: 'Warehouse', type: 'relation', required: true, visible: true, isCustom: false },
    { fieldName: 'ItemId', label: 'Item', type: 'relation', required: true, visible: true, isCustom: false },
    { fieldName: 'quantity', label: 'Quantity', type: 'number', required: true, visible: true, isCustom: false },
    { fieldName: 'referenceId', label: 'Reference ID', type: 'text', required: false, visible: true, isCustom: false },
    { fieldName: 'batchNumber', label: 'Batch Number', type: 'text', required: false, visible: true, isCustom: false },
    { fieldName: 'lotNumber', label: 'Lot Number', type: 'text', required: false, visible: true, isCustom: false },
    { fieldName: 'serialNumber', label: 'Serial Number', type: 'text', required: false, visible: true, isCustom: false }
  ],
  StockTransfer: [
    { fieldName: 'fromWarehouseId', label: 'Source Warehouse', type: 'relation', required: true, visible: true, isCustom: false },
    { fieldName: 'toWarehouseId', label: 'Destination Warehouse', type: 'relation', required: true, visible: true, isCustom: false },
    { fieldName: 'transferDate', label: 'Transfer Date', type: 'date', required: true, visible: true, isCustom: false },
    { fieldName: 'status', label: 'Status', type: 'select', options: '["Draft", "Pending", "In Transit", "Completed"]', required: true, visible: true, isCustom: false },
    { fieldName: 'remarks', label: 'Remarks / Purpose', type: 'textarea', required: false, visible: true, isCustom: false }
  ],
  MaterialConsumption: [
    { fieldName: 'WarehouseId', label: 'Warehouse', type: 'relation', required: true, visible: true, isCustom: false },
    { fieldName: 'ProjectId', label: 'Project', type: 'relation', required: false, visible: true, isCustom: false },
    { fieldName: 'consumptionDate', label: 'Consumption Date', type: 'date', required: true, visible: true, isCustom: false },
    { fieldName: 'remarks', label: 'Remarks / Purpose', type: 'textarea', required: false, visible: true, isCustom: false }
  ]
};

// GET all fields for a module (seeds defaults if they don't exist)
router.get('/:module', authenticateToken, async (req, res) => {
  const { module } = req.params;
  const CompanyId = req.user.CompanyId;

  if (!defaultFields[module]) {
    return res.status(400).json({ error: 'Invalid module name' });
  }

  try {
    let fields = await MasterField.findAll({
      where: { CompanyId, module },
      order: [['sortOrder', 'ASC']]
    });

    if (fields.length === 0) {
      // Seed default fields
      const fieldsToCreate = defaultFields[module].map((f, idx) => ({
        ...f,
        CompanyId,
        module,
        sortOrder: idx
      }));
      fields = await MasterField.bulkCreate(fieldsToCreate);
    } else {
      // Heal missing standard fields
      const existingFieldNames = fields.map(f => f.fieldName);
      const missingFields = defaultFields[module].filter(f => !existingFieldNames.includes(f.fieldName));
      if (missingFields.length > 0) {
        console.log(`Auto-Healing: Adding missing default fields for ${module}:`, missingFields.map(f => f.fieldName));
        const maxSortOrder = fields.reduce((max, f) => f.sortOrder > max ? f.sortOrder : max, -1);
        const fieldsToCreate = missingFields.map((f, idx) => ({
          ...f,
          CompanyId,
          module,
          sortOrder: maxSortOrder + 1 + idx
        }));
        const created = await MasterField.bulkCreate(fieldsToCreate);
        fields = [...fields, ...created].sort((a, b) => a.sortOrder - b.sortOrder);
      }
    }

    res.json(fields);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch field configurations' });
  }
});

// PUT reorder fields
router.put('/:module/reorder', authenticateToken, requireRole(['Admin']), async (req, res) => {
  const { module } = req.params;
  const { orderedFieldNames } = req.body; // Array of fieldName strings in order
  const CompanyId = req.user.CompanyId;

  try {
    const fields = await MasterField.findAll({
      where: { CompanyId, module }
    });

    // Update sortOrder for each fieldName
    const promises = fields.map(field => {
      const newIndex = orderedFieldNames.indexOf(field.fieldName);
      if (newIndex !== -1) {
        return field.update({ sortOrder: newIndex });
      }
      return Promise.resolve();
    });

    await Promise.all(promises);

    const updatedFields = await MasterField.findAll({
      where: { CompanyId, module },
      order: [['sortOrder', 'ASC']]
    });

    res.json(updatedFields);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to reorder fields' });
  }
});

// PUT update a specific field config
router.put('/:module/:fieldName', authenticateToken, requireRole(['Admin']), async (req, res) => {
  const { module, fieldName } = req.params;
  const { label, visible, required, options } = req.body;
  const CompanyId = req.user.CompanyId;

  try {
    const field = await MasterField.findOne({
      where: { CompanyId, module, fieldName }
    });

    if (!field) {
      return res.status(404).json({ error: 'Field configuration not found' });
    }

    // Standard fields should not have their fieldName changed or deleted, but they can be hidden or relabeled.
    // Allow updating visible, required, label, and options
    await field.update({
      label: label !== undefined ? label : field.label,
      visible: visible !== undefined ? visible : field.visible,
      required: required !== undefined ? required : field.required,
      options: options !== undefined ? (typeof options === 'string' ? options : JSON.stringify(options)) : field.options
    });

    res.json(field);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update field configuration' });
  }
});

// POST add a custom field
router.post('/:module/custom', authenticateToken, requireRole(['Admin']), async (req, res) => {
  const { module } = req.params;
  const { label, type, options, required, visible } = req.body;
  const CompanyId = req.user.CompanyId;

  try {
    // Determine next sort order
    const maxSortField = await MasterField.findOne({
      where: { CompanyId, module },
      order: [['sortOrder', 'DESC']]
    });
    const nextSortOrder = maxSortField ? maxSortField.sortOrder + 1 : 0;

    // Generate unique field name
    const timestamp = Date.now();
    const fieldName = `customField_${timestamp}`;

    const newField = await MasterField.create({
      CompanyId,
      module,
      fieldName,
      label,
      type,
      options: options ? (typeof options === 'string' ? options : JSON.stringify(options)) : null,
      required: required || false,
      visible: visible !== undefined ? visible : true,
      isCustom: true,
      sortOrder: nextSortOrder
    });

    res.status(201).json(newField);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create custom field' });
  }
});

// DELETE a custom field
router.delete('/:module/:fieldName', authenticateToken, requireRole(['Admin']), async (req, res) => {
  const { module, fieldName } = req.params;
  const CompanyId = req.user.CompanyId;

  try {
    const field = await MasterField.findOne({
      where: { CompanyId, module, fieldName }
    });

    if (!field) {
      return res.status(404).json({ error: 'Field not found' });
    }

    if (!field.isCustom) {
      return res.status(400).json({ error: 'Standard fields cannot be deleted' });
    }

    await field.destroy();
    res.json({ message: 'Field deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete custom field' });
  }
});

export default router;
