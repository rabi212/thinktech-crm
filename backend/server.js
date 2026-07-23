import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import sequelize from './src/config/db.js';
import Company from './src/models/company.js';
import User from './src/models/user.js';
import Client from './src/models/client.js';
import Branch from './src/models/branch.js';
import Department from './src/models/department.js';
import Designation from './src/models/designation.js';
import Enquiry from './src/models/enquiry.js';
import Quotation from './src/models/quotation.js';
import Invoice from './src/models/invoice.js';
import Expense from './src/models/expense.js';
import CustomerMaster from './src/models/customerMaster.js';
import Vendor from './src/models/vendor.js';
import EmployeeMaster from './src/models/employeeMaster.js';
import ProjectMaster from './src/models/projectMaster.js';
import MasterField from './src/models/masterField.js';
import ItemCategory from './src/models/itemCategory.js';
import Item from './src/models/item.js';
import Unit from './src/models/unit.js';
import ExpenseCategory from './src/models/expenseCategory.js';
import Warehouse from './src/models/warehouse.js';
import Location from './src/models/location.js';
import ServiceCategory from './src/models/serviceCategory.js';
import AmcCategory from './src/models/amcCategory.js';
import Vehicle from './src/models/vehicle.js';
import Asset from './src/models/asset.js';
import Lead from './src/models/lead.js';
import LeadActivity from './src/models/leadActivity.js';
import EnquiryActivity from './src/models/enquiryActivity.js';
import EnquiryAttachment from './src/models/enquiryAttachment.js';
import CustomerPurchaseOrder from './src/models/customerPurchaseOrder.js';
import SalesOrder from './src/models/salesOrder.js';
import DispatchPlan from './src/models/dispatchPlan.js';
import DeliveryTracking from './src/models/deliveryTracking.js';
import CreditNote from './src/models/creditNote.js';
import DebitNote from './src/models/debitNote.js';
import SalesReturn from './src/models/salesReturn.js';
import VendorEnquiry from './src/models/vendorEnquiry.js';
import VendorQuotation from './src/models/vendorQuotation.js';
import PurchaseRequisition from './src/models/purchaseRequisition.js';
import PurchaseApproval from './src/models/purchaseApproval.js';
import PurchaseOrder from './src/models/purchaseOrder.js';
import GoodsReceiptNote from './src/models/goodsReceiptNote.js';
import VendorBill from './src/models/vendorBill.js';
import VendorPayment from './src/models/vendorPayment.js';
import VendorEnquiryActivity from './src/models/vendorEnquiryActivity.js';
import VendorEnquiryAttachment from './src/models/vendorEnquiryAttachment.js';
import Stock from './src/models/stock.js';
import StockMovement from './src/models/stockMovement.js';
import StockTransfer from './src/models/stockTransfer.js';
import MaterialConsumption from './src/models/materialConsumption.js';
import { authenticateToken, requireRole } from './src/middleware/auth.js';

// Route Imports
import authRouter from './src/routes/auth.js';
import superadminRouter from './src/routes/superadmin.js';
import settingsRouter from './src/routes/settings.js';
import branchRouter from './src/routes/branches.js';
import departmentRouter from './src/routes/departments.js';
import designationRouter from './src/routes/designations.js';
import userRouter from './src/routes/users.js';
import enquiryRouter from './src/routes/enquiries.js';
import quotationRouter from './src/routes/quotations.js';
import invoiceRouter from './src/routes/invoices.js';
import expenseRouter from './src/routes/expenses.js';
import reportRouter from './src/routes/reports.js';
import clientRouter from './src/routes/clients.js';
import customerMasterRouter from './src/routes/customerMaster.js';
import vendorRouter from './src/routes/vendors.js';
import employeeMasterRouter from './src/routes/employeeMaster.js';
import projectMasterRouter from './src/routes/projectMaster.js';
import masterFieldsRouter from './src/routes/masterFields.js';
import itemCategoryRouter from './src/routes/itemCategories.js';
import itemsRouter from './src/routes/items.js';
import unitRouter from './src/routes/units.js';
import expenseCategoryRouter from './src/routes/expenseCategories.js';
import warehouseRouter from './src/routes/warehouses.js';
import locationRouter from './src/routes/locations.js';
import serviceCategoryRouter from './src/routes/serviceCategories.js';
import amcCategoryRouter from './src/routes/amcCategories.js';
import vehicleRouter from './src/routes/vehicles.js';
import assetRouter from './src/routes/assets.js';
import leadsRouter from './src/routes/leads.js';
import leadActivitiesRouter from './src/routes/leadActivities.js';
import salesOrdersRouter from './src/routes/salesOrders.js';
import customerPOsRouter from './src/routes/customerPOs.js';
import dispatchPlanningRouter from './src/routes/dispatchPlanning.js';
import deliveryTrackingRouter from './src/routes/deliveryTracking.js';
import creditNotesRouter from './src/routes/creditNotes.js';
import debitNotesRouter from './src/routes/debitNotes.js';
import salesReturnsRouter from './src/routes/salesReturns.js';
import vendorEnquiriesRouter from './src/routes/vendorEnquiries.js';
import vendorQuotationsRouter from './src/routes/vendorQuotations.js';
import purchaseRequisitionsRouter from './src/routes/purchaseRequisitions.js';
import purchaseApprovalsRouter from './src/routes/purchaseApprovals.js';
import purchaseOrdersRouter from './src/routes/purchaseOrders.js';
import goodsReceiptNotesRouter from './src/routes/goodsReceiptNotes.js';
import vendorBillsRouter from './src/routes/vendorBills.js';
import vendorPaymentsRouter from './src/routes/vendorPayments.js';
import stocksRouter from './src/routes/stocks.js';
import stockTransfersRouter from './src/routes/stockTransfers.js';
import materialConsumptionsRouter from './src/routes/materialConsumptions.js';
import inventoryReportsRouter from './src/routes/inventoryReports.js';

import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'thinktech_crm_secret_key';

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Setup Associations
Company.hasMany(User, { onDelete: 'CASCADE' });
User.belongsTo(Company);

Company.hasMany(Branch, { onDelete: 'CASCADE' });
Branch.belongsTo(Company);

Company.hasMany(Department, { onDelete: 'CASCADE' });
Department.belongsTo(Company);

Company.hasMany(Designation, { onDelete: 'CASCADE' });
Designation.belongsTo(Company);

Company.hasMany(Client, { onDelete: 'CASCADE' });
Client.belongsTo(Company);

Company.hasMany(Enquiry, { onDelete: 'CASCADE' });
Enquiry.belongsTo(Company);

Company.hasMany(Quotation, { onDelete: 'CASCADE' });
Quotation.belongsTo(Company);

Company.hasMany(Invoice, { onDelete: 'CASCADE' });
Invoice.belongsTo(Company);

Company.hasMany(Expense, { onDelete: 'CASCADE' });
Expense.belongsTo(Company);

User.hasMany(Expense, { onDelete: 'CASCADE' });
Expense.belongsTo(User);

Company.hasMany(CustomerMaster, { onDelete: 'CASCADE' });
CustomerMaster.belongsTo(Company);

Company.hasMany(Vendor, { onDelete: 'CASCADE' });
Vendor.belongsTo(Company);

Company.hasMany(EmployeeMaster, { onDelete: 'CASCADE' });
EmployeeMaster.belongsTo(Company);

Company.hasMany(ProjectMaster, { onDelete: 'CASCADE' });
ProjectMaster.belongsTo(Company);

Company.hasMany(MasterField, { onDelete: 'CASCADE' });
MasterField.belongsTo(Company);

Company.hasMany(ItemCategory, { onDelete: 'CASCADE' });
ItemCategory.belongsTo(Company);

Company.hasMany(Item, { onDelete: 'CASCADE' });
Item.belongsTo(Company);

Company.hasMany(Unit, { onDelete: 'CASCADE' });
Unit.belongsTo(Company);

Company.hasMany(ExpenseCategory, { onDelete: 'CASCADE' });
ExpenseCategory.belongsTo(Company);

Company.hasMany(Warehouse, { onDelete: 'CASCADE' });
Warehouse.belongsTo(Company);

Company.hasMany(Location, { onDelete: 'CASCADE' });
Location.belongsTo(Company);

Warehouse.hasMany(Location, { onDelete: 'RESTRICT' });
Location.belongsTo(Warehouse);

Company.hasMany(ServiceCategory, { onDelete: 'CASCADE' });
ServiceCategory.belongsTo(Company);

ServiceCategory.hasMany(ServiceCategory, { as: 'Subcategories', foreignKey: 'ParentId', onDelete: 'SET NULL' });
ServiceCategory.belongsTo(ServiceCategory, { as: 'Parent', foreignKey: 'ParentId' });

Company.hasMany(AmcCategory, { onDelete: 'CASCADE' });
AmcCategory.belongsTo(Company);

Company.hasMany(Vehicle, { onDelete: 'CASCADE' });
Vehicle.belongsTo(Company);

Vehicle.belongsTo(Branch, { foreignKey: 'BranchId', onDelete: 'SET NULL' });
Branch.hasMany(Vehicle, { foreignKey: 'BranchId' });

Vehicle.belongsTo(EmployeeMaster, { as: 'AssignedDriver', foreignKey: 'AssignedDriverId', onDelete: 'SET NULL' });
EmployeeMaster.hasMany(Vehicle, { foreignKey: 'AssignedDriverId' });

Company.hasMany(Asset, { onDelete: 'CASCADE' });
Asset.belongsTo(Company);

Company.hasMany(Lead, { onDelete: 'CASCADE' });
Lead.belongsTo(Company);

Company.hasMany(LeadActivity, { onDelete: 'CASCADE' });
LeadActivity.belongsTo(Company);

Lead.hasMany(LeadActivity, { onDelete: 'CASCADE' });
LeadActivity.belongsTo(Lead);

Lead.belongsTo(EmployeeMaster, { as: 'AssignedTo', foreignKey: 'AssignedToId', onDelete: 'SET NULL' });
EmployeeMaster.hasMany(Lead, { foreignKey: 'AssignedToId' });

LeadActivity.belongsTo(User, { as: 'Creator', foreignKey: 'CreatedByUserId', onDelete: 'SET NULL' });
User.hasMany(LeadActivity, { foreignKey: 'CreatedByUserId' });

Company.hasMany(EnquiryActivity, { onDelete: 'CASCADE' });
EnquiryActivity.belongsTo(Company);

Company.hasMany(EnquiryAttachment, { onDelete: 'CASCADE' });
EnquiryAttachment.belongsTo(Company);

Enquiry.hasMany(EnquiryActivity, { onDelete: 'CASCADE' });
EnquiryActivity.belongsTo(Enquiry);

Enquiry.hasMany(EnquiryAttachment, { onDelete: 'CASCADE' });
EnquiryAttachment.belongsTo(Enquiry);

Enquiry.belongsTo(CustomerMaster, { foreignKey: 'CustomerMasterId' });
CustomerMaster.hasMany(Enquiry, { foreignKey: 'CustomerMasterId' });

Enquiry.belongsTo(EmployeeMaster, { as: 'AssignedTo', foreignKey: 'AssignedToId', onDelete: 'SET NULL' });
EmployeeMaster.hasMany(Enquiry, { foreignKey: 'AssignedToId' });

EnquiryActivity.belongsTo(User, { as: 'Creator', foreignKey: 'CreatedByUserId', onDelete: 'SET NULL' });
User.hasMany(EnquiryActivity, { foreignKey: 'CreatedByUserId' });

Company.hasMany(VendorEnquiryActivity, { onDelete: 'CASCADE' });
VendorEnquiryActivity.belongsTo(Company);

Company.hasMany(VendorEnquiryAttachment, { onDelete: 'CASCADE' });
VendorEnquiryAttachment.belongsTo(Company);

VendorEnquiry.hasMany(VendorEnquiryActivity, { onDelete: 'CASCADE' });
VendorEnquiryActivity.belongsTo(VendorEnquiry);

VendorEnquiry.hasMany(VendorEnquiryAttachment, { onDelete: 'CASCADE' });
VendorEnquiryAttachment.belongsTo(VendorEnquiry);

VendorEnquiryActivity.belongsTo(User, { as: 'Creator', foreignKey: 'CreatedByUserId', onDelete: 'SET NULL' });
User.hasMany(VendorEnquiryActivity, { foreignKey: 'CreatedByUserId' });

Asset.belongsTo(Branch, { foreignKey: 'BranchId', onDelete: 'SET NULL' });
Branch.hasMany(Asset, { foreignKey: 'BranchId' });

Asset.belongsTo(Department, { foreignKey: 'DepartmentId', onDelete: 'SET NULL' });
Department.hasMany(Asset, { foreignKey: 'DepartmentId' });

Asset.belongsTo(EmployeeMaster, { as: 'AssignedEmployee', foreignKey: 'AssignedEmployeeId', onDelete: 'SET NULL' });
EmployeeMaster.hasMany(Asset, { foreignKey: 'AssignedEmployeeId' });

Asset.belongsTo(Vendor, { foreignKey: 'VendorId', onDelete: 'SET NULL' });
Vendor.hasMany(Asset, { foreignKey: 'VendorId' });

Asset.belongsTo(Location, { foreignKey: 'LocationId', onDelete: 'SET NULL' });
Location.hasMany(Asset, { foreignKey: 'LocationId' });

Warehouse.belongsTo(Branch, { foreignKey: 'BranchId', onDelete: 'RESTRICT' });
Branch.hasMany(Warehouse, { foreignKey: 'BranchId' });

Warehouse.belongsTo(EmployeeMaster, { as: 'Manager', foreignKey: 'ManagerId', onDelete: 'SET NULL' });
EmployeeMaster.hasMany(Warehouse, { foreignKey: 'ManagerId' });

ItemCategory.hasMany(Item, { foreignKey: 'ItemCategoryId', onDelete: 'SET NULL' });
Item.belongsTo(ItemCategory, { foreignKey: 'ItemCategoryId', as: 'Category' });

CustomerMaster.hasMany(ProjectMaster, { foreignKey: 'CustomerMasterId', onDelete: 'SET NULL' });
ProjectMaster.belongsTo(CustomerMaster, { foreignKey: 'CustomerMasterId', as: 'Customer' });

EmployeeMaster.hasMany(ProjectMaster, { foreignKey: 'ProjectManagerId', onDelete: 'SET NULL' });
ProjectMaster.belongsTo(EmployeeMaster, { foreignKey: 'ProjectManagerId', as: 'ProjectManager' });

Department.hasMany(EmployeeMaster, { foreignKey: 'DepartmentId', onDelete: 'SET NULL' });
EmployeeMaster.belongsTo(Department, { foreignKey: 'DepartmentId' });

Designation.hasMany(EmployeeMaster, { foreignKey: 'DesignationId', onDelete: 'SET NULL' });
EmployeeMaster.belongsTo(Designation, { foreignKey: 'DesignationId' });

Branch.hasMany(EmployeeMaster, { foreignKey: 'BranchId', onDelete: 'SET NULL' });
EmployeeMaster.belongsTo(Branch, { foreignKey: 'BranchId' });

EmployeeMaster.hasMany(EmployeeMaster, { as: 'Subordinates', foreignKey: 'ReportingManagerId', onDelete: 'SET NULL' });
EmployeeMaster.belongsTo(EmployeeMaster, { as: 'ReportingManager', foreignKey: 'ReportingManagerId' });

User.hasOne(EmployeeMaster, { foreignKey: 'UserId', onDelete: 'SET NULL' });
EmployeeMaster.belongsTo(User, { foreignKey: 'UserId' });

User.hasMany(User, { as: 'Subordinates', foreignKey: 'ReportingManagerId', onDelete: 'SET NULL' });
User.belongsTo(User, { as: 'ReportingManager', foreignKey: 'ReportingManagerId' });

Enquiry.hasMany(Quotation, { onDelete: 'SET NULL' });
Quotation.belongsTo(Enquiry);

CustomerMaster.hasMany(Quotation, { foreignKey: 'CustomerMasterId', onDelete: 'SET NULL' });
Quotation.belongsTo(CustomerMaster, { foreignKey: 'CustomerMasterId', as: 'Customer' });

Quotation.hasMany(Quotation, { as: 'Revisions', foreignKey: 'parentQuotationId', onDelete: 'SET NULL' });
Quotation.belongsTo(Quotation, { as: 'ParentQuotation', foreignKey: 'parentQuotationId' });

// Sales Management Associations
Company.hasMany(CustomerPurchaseOrder, { onDelete: 'CASCADE' });
CustomerPurchaseOrder.belongsTo(Company);

Company.hasMany(SalesOrder, { onDelete: 'CASCADE' });
SalesOrder.belongsTo(Company);

Company.hasMany(DispatchPlan, { onDelete: 'CASCADE' });
DispatchPlan.belongsTo(Company);

Company.hasMany(DeliveryTracking, { onDelete: 'CASCADE' });
DeliveryTracking.belongsTo(Company);

Company.hasMany(CreditNote, { onDelete: 'CASCADE' });
CreditNote.belongsTo(Company);

Company.hasMany(DebitNote, { onDelete: 'CASCADE' });
DebitNote.belongsTo(Company);

Company.hasMany(SalesReturn, { onDelete: 'CASCADE' });
SalesReturn.belongsTo(Company);

CustomerMaster.hasMany(CustomerPurchaseOrder, { foreignKey: 'CustomerMasterId', onDelete: 'CASCADE' });
CustomerPurchaseOrder.belongsTo(CustomerMaster, { foreignKey: 'CustomerMasterId' });

CustomerMaster.hasMany(SalesOrder, { foreignKey: 'CustomerMasterId', onDelete: 'CASCADE' });
SalesOrder.belongsTo(CustomerMaster, { foreignKey: 'CustomerMasterId', as: 'Customer' });

CustomerPurchaseOrder.hasMany(SalesOrder, { foreignKey: 'CustomerPurchaseOrderId', onDelete: 'SET NULL' });
SalesOrder.belongsTo(CustomerPurchaseOrder, { foreignKey: 'CustomerPurchaseOrderId', as: 'CustomerPurchaseOrder' });

Quotation.hasMany(SalesOrder, { foreignKey: 'QuotationId', onDelete: 'SET NULL' });
SalesOrder.belongsTo(Quotation, { foreignKey: 'QuotationId', as: 'Quotation' });

SalesOrder.hasMany(DispatchPlan, { foreignKey: 'SalesOrderId', onDelete: 'CASCADE' });
DispatchPlan.belongsTo(SalesOrder, { foreignKey: 'SalesOrderId', as: 'SalesOrder' });

Warehouse.hasMany(DispatchPlan, { foreignKey: 'WarehouseId', onDelete: 'SET NULL' });
DispatchPlan.belongsTo(Warehouse, { foreignKey: 'WarehouseId', as: 'Warehouse' });

DispatchPlan.hasMany(DeliveryTracking, { foreignKey: 'DispatchPlanId', onDelete: 'CASCADE' });
DeliveryTracking.belongsTo(DispatchPlan, { foreignKey: 'DispatchPlanId', as: 'DispatchPlan' });

Vehicle.hasMany(DeliveryTracking, { foreignKey: 'VehicleId', onDelete: 'SET NULL' });
DeliveryTracking.belongsTo(Vehicle, { foreignKey: 'VehicleId', as: 'Vehicle' });

SalesOrder.hasMany(Invoice, { foreignKey: 'SalesOrderId', onDelete: 'SET NULL' });
Invoice.belongsTo(SalesOrder, { foreignKey: 'SalesOrderId', as: 'SalesOrder' });

Invoice.hasMany(CreditNote, { foreignKey: 'InvoiceId', onDelete: 'CASCADE' });
CreditNote.belongsTo(Invoice, { foreignKey: 'InvoiceId', as: 'Invoice' });

Invoice.hasMany(DebitNote, { foreignKey: 'InvoiceId', onDelete: 'CASCADE' });
DebitNote.belongsTo(Invoice, { foreignKey: 'InvoiceId', as: 'Invoice' });

Invoice.hasMany(SalesReturn, { foreignKey: 'InvoiceId', onDelete: 'CASCADE' });
SalesReturn.belongsTo(Invoice, { foreignKey: 'InvoiceId', as: 'Invoice' });

CreditNote.hasOne(SalesReturn, { foreignKey: 'CreditNoteId', onDelete: 'SET NULL' });
SalesReturn.belongsTo(CreditNote, { foreignKey: 'CreditNoteId', as: 'CreditNote' });

// Purchase Management Associations
Company.hasMany(VendorEnquiry, { onDelete: 'CASCADE' });
VendorEnquiry.belongsTo(Company);

Company.hasMany(VendorQuotation, { onDelete: 'CASCADE' });
VendorQuotation.belongsTo(Company);

Company.hasMany(PurchaseRequisition, { onDelete: 'CASCADE' });
PurchaseRequisition.belongsTo(Company);

Company.hasMany(PurchaseApproval, { onDelete: 'CASCADE' });
PurchaseApproval.belongsTo(Company);

Company.hasMany(PurchaseOrder, { onDelete: 'CASCADE' });
PurchaseOrder.belongsTo(Company);

Company.hasMany(GoodsReceiptNote, { onDelete: 'CASCADE' });
GoodsReceiptNote.belongsTo(Company);

Company.hasMany(VendorBill, { onDelete: 'CASCADE' });
VendorBill.belongsTo(Company);

Company.hasMany(VendorPayment, { onDelete: 'CASCADE' });
VendorPayment.belongsTo(Company);

// Vendor Purchase - Vendor Associations
Vendor.hasMany(VendorEnquiry, { foreignKey: 'VendorId', onDelete: 'CASCADE' });
VendorEnquiry.belongsTo(Vendor, { foreignKey: 'VendorId', as: 'Vendor' });

Vendor.hasMany(VendorQuotation, { foreignKey: 'VendorId', onDelete: 'CASCADE' });
VendorQuotation.belongsTo(Vendor, { foreignKey: 'VendorId', as: 'Vendor' });

Vendor.hasMany(PurchaseOrder, { foreignKey: 'VendorId', onDelete: 'CASCADE' });
PurchaseOrder.belongsTo(Vendor, { foreignKey: 'VendorId', as: 'Vendor' });

Vendor.hasMany(GoodsReceiptNote, { foreignKey: 'VendorId', onDelete: 'CASCADE' });
GoodsReceiptNote.belongsTo(Vendor, { foreignKey: 'VendorId', as: 'Vendor' });

Vendor.hasMany(VendorBill, { foreignKey: 'VendorId', onDelete: 'CASCADE' });
VendorBill.belongsTo(Vendor, { foreignKey: 'VendorId', as: 'Vendor' });

Vendor.hasMany(VendorPayment, { foreignKey: 'VendorId', onDelete: 'CASCADE' });
VendorPayment.belongsTo(Vendor, { foreignKey: 'VendorId', as: 'Vendor' });

// Purchase - Enquiry/Quotation/Requisition Associations
VendorEnquiry.hasMany(VendorQuotation, { foreignKey: 'VendorEnquiryId', onDelete: 'SET NULL' });
VendorQuotation.belongsTo(VendorEnquiry, { foreignKey: 'VendorEnquiryId', as: 'VendorEnquiry' });

VendorQuotation.hasMany(VendorQuotation, { as: 'Revisions', foreignKey: 'parentQuotationId', onDelete: 'SET NULL' });
VendorQuotation.belongsTo(VendorQuotation, { as: 'ParentQuotation', foreignKey: 'parentQuotationId' });

VendorQuotation.hasMany(PurchaseOrder, { foreignKey: 'VendorQuotationId', onDelete: 'SET NULL' });
PurchaseOrder.belongsTo(VendorQuotation, { foreignKey: 'VendorQuotationId', as: 'VendorQuotation' });

PurchaseRequisition.hasMany(PurchaseOrder, { foreignKey: 'PurchaseRequisitionId', onDelete: 'SET NULL' });
PurchaseOrder.belongsTo(PurchaseRequisition, { foreignKey: 'PurchaseRequisitionId', as: 'PurchaseRequisition' });

Warehouse.hasMany(PurchaseOrder, { foreignKey: 'WarehouseId', onDelete: 'SET NULL' });
PurchaseOrder.belongsTo(Warehouse, { foreignKey: 'WarehouseId', as: 'Warehouse' });
CustomerMaster.hasMany(PurchaseOrder, { foreignKey: 'CustomerId', onDelete: 'SET NULL' });
PurchaseOrder.belongsTo(CustomerMaster, { foreignKey: 'CustomerId', as: 'Customer' });

Warehouse.hasMany(GoodsReceiptNote, { foreignKey: 'WarehouseId', onDelete: 'SET NULL' });
GoodsReceiptNote.belongsTo(Warehouse, { foreignKey: 'WarehouseId', as: 'Warehouse' });

// Purchase Order → GRN → Bill chain
PurchaseOrder.hasMany(GoodsReceiptNote, { foreignKey: 'PurchaseOrderId', onDelete: 'CASCADE' });
GoodsReceiptNote.belongsTo(PurchaseOrder, { foreignKey: 'PurchaseOrderId', as: 'PurchaseOrder' });

PurchaseOrder.hasMany(VendorBill, { foreignKey: 'PurchaseOrderId', onDelete: 'SET NULL' });
VendorBill.belongsTo(PurchaseOrder, { foreignKey: 'PurchaseOrderId', as: 'PurchaseOrder' });

GoodsReceiptNote.hasMany(VendorBill, { foreignKey: 'GRNId', onDelete: 'SET NULL' });
VendorBill.belongsTo(GoodsReceiptNote, { foreignKey: 'GRNId', as: 'GRN' });

// Bill → Payment chain
VendorBill.hasMany(VendorPayment, { foreignKey: 'VendorBillId', onDelete: 'SET NULL' });
VendorPayment.belongsTo(VendorBill, { foreignKey: 'VendorBillId', as: 'VendorBill' });

// User/Department/Employee associations
User.hasMany(VendorEnquiry, { foreignKey: 'AssignedToId', onDelete: 'SET NULL' });
VendorEnquiry.belongsTo(User, { foreignKey: 'AssignedToId', as: 'AssignedTo' });

User.hasMany(PurchaseRequisition, { foreignKey: 'RequestedById', onDelete: 'CASCADE' });
PurchaseRequisition.belongsTo(User, { foreignKey: 'RequestedById', as: 'RequestedBy' });

Department.hasMany(PurchaseRequisition, { foreignKey: 'DepartmentId', onDelete: 'SET NULL' });
PurchaseRequisition.belongsTo(Department, { foreignKey: 'DepartmentId', as: 'Department' });

Warehouse.hasMany(PurchaseRequisition, { foreignKey: 'WarehouseId', onDelete: 'SET NULL' });
PurchaseRequisition.belongsTo(Warehouse, { foreignKey: 'WarehouseId', as: 'Warehouse' });

User.hasMany(PurchaseApproval, { foreignKey: 'initiatedBy', onDelete: 'CASCADE' });
PurchaseApproval.belongsTo(User, { foreignKey: 'initiatedBy', as: 'InitiatedByUser' });

Branch.hasMany(User, { foreignKey: 'BranchId', onDelete: 'SET NULL' });
User.belongsTo(Branch, { foreignKey: 'BranchId' });

Department.hasMany(User, { foreignKey: 'DepartmentId', onDelete: 'SET NULL' });
User.belongsTo(Department, { foreignKey: 'DepartmentId' });

Designation.hasMany(User, { foreignKey: 'DesignationId', onDelete: 'SET NULL' });
User.belongsTo(Designation, { foreignKey: 'DesignationId' });

// Inventory Management Associations
Company.hasMany(Stock, { onDelete: 'CASCADE' });
Stock.belongsTo(Company);

Company.hasMany(StockMovement, { onDelete: 'CASCADE' });
StockMovement.belongsTo(Company);

Company.hasMany(StockTransfer, { onDelete: 'CASCADE' });
StockTransfer.belongsTo(Company);

Company.hasMany(MaterialConsumption, { onDelete: 'CASCADE' });
MaterialConsumption.belongsTo(Company);

Item.hasMany(Stock, { foreignKey: 'ItemId', onDelete: 'CASCADE' });
Stock.belongsTo(Item, { foreignKey: 'ItemId' });

Warehouse.hasMany(Stock, { foreignKey: 'WarehouseId', onDelete: 'CASCADE' });
Stock.belongsTo(Warehouse, { foreignKey: 'WarehouseId' });

Item.hasMany(StockMovement, { foreignKey: 'ItemId', onDelete: 'CASCADE' });
StockMovement.belongsTo(Item, { foreignKey: 'ItemId' });

Warehouse.hasMany(StockMovement, { as: 'FromWarehouse', foreignKey: 'fromWarehouseId', onDelete: 'SET NULL' });
StockMovement.belongsTo(Warehouse, { as: 'FromWarehouse', foreignKey: 'fromWarehouseId' });

Warehouse.hasMany(StockMovement, { as: 'ToWarehouse', foreignKey: 'toWarehouseId', onDelete: 'SET NULL' });
StockMovement.belongsTo(Warehouse, { as: 'ToWarehouse', foreignKey: 'toWarehouseId' });

User.hasMany(StockMovement, { foreignKey: 'CreatedByUserId', onDelete: 'SET NULL' });
StockMovement.belongsTo(User, { foreignKey: 'CreatedByUserId', as: 'CreatedByUser' });

Warehouse.hasMany(StockTransfer, { as: 'SourceWarehouse', foreignKey: 'fromWarehouseId', onDelete: 'RESTRICT' });
StockTransfer.belongsTo(Warehouse, { as: 'SourceWarehouse', foreignKey: 'fromWarehouseId' });

Warehouse.hasMany(StockTransfer, { as: 'DestinationWarehouse', foreignKey: 'toWarehouseId', onDelete: 'RESTRICT' });
StockTransfer.belongsTo(Warehouse, { as: 'DestinationWarehouse', foreignKey: 'toWarehouseId' });

Warehouse.hasMany(MaterialConsumption, { foreignKey: 'WarehouseId', onDelete: 'RESTRICT' });
MaterialConsumption.belongsTo(Warehouse, { foreignKey: 'WarehouseId' });

ProjectMaster.hasMany(MaterialConsumption, { foreignKey: 'ProjectId', onDelete: 'SET NULL' });
MaterialConsumption.belongsTo(ProjectMaster, { foreignKey: 'ProjectId', as: 'Project' });
// --- Mount Routes ---
app.use('/api/auth', authRouter);
app.use('/api/superadmin', superadminRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/branches', branchRouter);
app.use('/api/departments', departmentRouter);
app.use('/api/designations', designationRouter);
app.use('/api/users', userRouter);
app.use('/api/enquiries', enquiryRouter);
app.use('/api/quotations', quotationRouter);
app.use('/api/invoices', invoiceRouter);
app.use('/api/expenses', expenseRouter);
app.use('/api/reports', reportRouter);
app.use('/api/clients', clientRouter);
app.use('/api/master/customers', customerMasterRouter);
app.use('/api/master/vendors', vendorRouter);
app.use('/api/master/employees', employeeMasterRouter);
app.use('/api/master/projects', projectMasterRouter);
app.use('/api/settings/fields', masterFieldsRouter);
app.use('/api/item-categories', itemCategoryRouter);
app.use('/api/items', itemsRouter);
app.use('/api/units', unitRouter);
app.use('/api/expense-categories', expenseCategoryRouter);
app.use('/api/warehouses', warehouseRouter);
app.use('/api/locations', locationRouter);
app.use('/api/service-categories', serviceCategoryRouter);
app.use('/api/amc-categories', amcCategoryRouter);
app.use('/api/vehicles', vehicleRouter);
app.use('/api/assets', assetRouter);
app.use('/api/leads', leadsRouter);
app.use('/api/lead-activities', leadActivitiesRouter);
app.use('/api/sales-orders', salesOrdersRouter);
app.use('/api/customer-pos', customerPOsRouter);
app.use('/api/dispatch-planning', dispatchPlanningRouter);
app.use('/api/delivery-tracking', deliveryTrackingRouter);
app.use('/api/credit-notes', creditNotesRouter);
app.use('/api/debit-notes', debitNotesRouter);
app.use('/api/sales-returns', salesReturnsRouter);

// Purchase Management Routes (under /api/vendor/)
app.use('/api/vendor/enquiries', vendorEnquiriesRouter);
app.use('/api/vendor/quotations', vendorQuotationsRouter);
app.use('/api/vendor/requisitions', purchaseRequisitionsRouter);
app.use('/api/vendor/approvals', purchaseApprovalsRouter);
app.use('/api/vendor/orders', purchaseOrdersRouter);
app.use('/api/vendor/grn', goodsReceiptNotesRouter);
app.use('/api/vendor/bills', vendorBillsRouter);
app.use('/api/vendor/payments', vendorPaymentsRouter);

// Inventory Management Routes
app.use('/api/inventory', stocksRouter);
app.use('/api/inventory/transfers', stockTransfersRouter);
app.use('/api/inventory/consumptions', materialConsumptionsRouter);
app.use('/api/inventory/reports', inventoryReportsRouter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'ThinkTech CRM SaaS Backend is online.' });
});

// --- Seeding Script ---
const seedDatabase = async () => {
  try {
    const superadminExists = await User.findOne({ where: { role: 'Superadmin' } });
    if (!superadminExists) {
      await User.create({
        name: 'Main Superadmin',
        email: 'superadmin@thinktech.com',
        password: 'admin123',
        role: 'Superadmin',
        CompanyId: null
      });
      console.log('Seed: Superadmin created.');
    }

    const companyCount = await Company.count();
    if (companyCount === 0) {
      // Seed default active Company 1
      const company1 = await Company.create({
        name: 'Company 1',
        email: 'info@company1.com',
        phone: '123-456-7890',
        status: 'Active', // Seeded companies are Active by default
        financialYear: '2026-2027',
        gstNumber: '29ABCDE1234F1Z5',
        taxRate: 18.00,
        currency: 'INR'
      });
      console.log('Seed: Company 1 created.');

      const branch1 = await Branch.create({ name: 'Bengaluru Head Office', address: 'MG Road, Bangalore', CompanyId: company1.id });
      const branch2 = await Branch.create({ name: 'Mumbai Branch', address: 'Andheri West, Mumbai', CompanyId: company1.id });

      const deptSales = await Department.create({ name: 'Sales Department', CompanyId: company1.id });
      const deptFinance = await Department.create({ name: 'Finance & Accounts', CompanyId: company1.id });

      const desExecutive = await Designation.create({ name: 'Senior Sales Executive', CompanyId: company1.id });

      await User.create({
        name: 'Company Admin',
        email: 'admin@company1.com',
        password: 'admin123',
        role: 'Admin',
        CompanyId: company1.id,
        BranchId: branch1.id
      });

      await User.create({
        name: 'Sales Executive User',
        email: 'sales@company1.com',
        password: 'sales123',
        role: 'SalesExecutive',
        CompanyId: company1.id,
        BranchId: branch1.id,
        DepartmentId: deptSales.id,
        DesignationId: desExecutive.id
      });

      await User.create({
        name: 'Accounts Executive',
        email: 'accounts@company1.com',
        password: 'accounts123',
        role: 'AccountsUser',
        CompanyId: company1.id,
        BranchId: branch1.id,
        DepartmentId: deptFinance.id
      });

      const employeeUser = await User.create({
        name: 'Standard Employee',
        email: 'employee@company1.com',
        password: 'employee123',
        role: 'Employee',
        CompanyId: company1.id,
        BranchId: branch2.id
      });

      await User.create({
        name: 'General Manager',
        email: 'manager@company1.com',
        password: 'manager123',
        role: 'Management',
        CompanyId: company1.id,
        BranchId: branch1.id
      });

      console.log('Seed: Users for all roles in Company 1 created.');

      const clientA = await Client.create({ name: 'Infosys', contact: 'Salil Parekh', email: 'salil@infosys.com', phone: '123-456-1111', status: 'Active', CompanyId: company1.id });
      const clientB = await Client.create({ name: 'Wipro', contact: 'Thierry Delaporte', email: 'thierry@wipro.com', phone: '987-654-2222', status: 'Lead', CompanyId: company1.id });

      const enquiry1 = await Enquiry.create({ title: '100 Licenses ERP Plan', clientName: 'Infosys', details: 'Client looking for enterprise licenses', estimatedValue: 500000.00, status: 'Open', CompanyId: company1.id });
      const enquiry2 = await Enquiry.create({ title: 'Cloud CRM Migration', clientName: 'Wipro', details: 'Client migration study', estimatedValue: 350000.00, status: 'Open', CompanyId: company1.id });

      await Quotation.create({ quotationNumber: 'QTN-2026-001', clientName: 'Infosys', totalAmount: 480000.00, details: 'Special discounted licensing plan', status: 'Sent', EnquiryId: enquiry1.id, CompanyId: company1.id });

      const invoice1 = await Invoice.create({ invoiceNumber: 'INV-2026-001', clientName: 'Infosys', totalAmount: 480000.00, amountPaid: 150000.00, status: 'Partially Paid', CompanyId: company1.id });
      const invoice2 = await Invoice.create({ invoiceNumber: 'INV-2026-002', clientName: 'Google India', totalAmount: 120000.00, amountPaid: 120000.00, status: 'Paid', CompanyId: company1.id });

       await Expense.create({ description: 'Client Lunch & travel expense', amount: 3500.00, status: 'Approved', UserId: employeeUser.id, CompanyId: company1.id });
      await Expense.create({ description: 'Printer paper & stationeries', amount: 1200.00, status: 'Pending', UserId: employeeUser.id, CompanyId: company1.id });

      console.log('Seed: Initial transactions seeded.');
    }

    // Seed default item categories if none exist
    const categoryCount = await ItemCategory.count();
    if (categoryCount === 0) {
      const company1 = await Company.findOne();
      if (company1) {
        const categories = [
          { categoryCode: 'CAT-0001', name: 'Electrical', description: 'Electrical categories & items', status: 'Active', CompanyId: company1.id },
          { categoryCode: 'CAT-0002', name: 'Mechanical', description: 'Mechanical tools & structures', status: 'Active', CompanyId: company1.id },
          { categoryCode: 'CAT-0003', name: 'Hardware', description: 'Hardware items & components', status: 'Active', CompanyId: company1.id },
          { categoryCode: 'CAT-0004', name: 'Software', description: 'Software packages & licenses', status: 'Active', CompanyId: company1.id },
          { categoryCode: 'CAT-0005', name: 'Consumables', description: 'General consumables & office supplies', status: 'Active', CompanyId: company1.id },
          { categoryCode: 'CAT-0006', name: 'Services', description: 'Services, consultancy, and labor', status: 'Active', CompanyId: company1.id }
        ];
        await ItemCategory.bulkCreate(categories);
        console.log('Seed: Default Item Categories seeded.');
      }
    }

    // Seed default units if none exist
    const unitCount = await Unit.count();
    if (unitCount === 0) {
      const company1 = await Company.findOne();
      if (company1) {
        const units = [
          { unitCode: 'UNT-0001', name: 'Nos', status: 'Active', CompanyId: company1.id },
          { unitCode: 'UNT-0002', name: 'Pcs', status: 'Active', CompanyId: company1.id },
          { unitCode: 'UNT-0003', name: 'Kg', status: 'Active', CompanyId: company1.id },
          { unitCode: 'UNT-0004', name: 'Meter', status: 'Active', CompanyId: company1.id },
          { unitCode: 'UNT-0005', name: 'Liter', status: 'Active', CompanyId: company1.id },
          { unitCode: 'UNT-0006', name: 'Set', status: 'Active', CompanyId: company1.id },
          { unitCode: 'UNT-0007', name: 'Box', status: 'Active', CompanyId: company1.id },
          { unitCode: 'UNT-0008', name: 'Hour', status: 'Active', CompanyId: company1.id },
          { unitCode: 'UNT-0009', name: 'Day', status: 'Active', CompanyId: company1.id }
        ];
        await Unit.bulkCreate(units);
        console.log('Seed: Default Units seeded.');
      }
    }

    // Seed default expense categories if none exist
    const expCount = await ExpenseCategory.count();
    if (expCount === 0) {
      const company1 = await Company.findOne();
      if (company1) {
        const categories = [
          { categoryCode: 'EXPC-0001', name: 'Travel', description: 'Business travel reimbursements', approvalRequired: false, status: 'Active', CompanyId: company1.id },
          { categoryCode: 'EXPC-0002', name: 'Fuel', description: 'Fuel expenses for official tours', approvalRequired: false, status: 'Active', CompanyId: company1.id },
          { categoryCode: 'EXPC-0003', name: 'Hotel', description: 'Hotel stay & lodging', approvalRequired: true, status: 'Active', CompanyId: company1.id },
          { categoryCode: 'EXPC-0004', name: 'Food', description: 'Meals & official client dinners', approvalRequired: false, status: 'Active', CompanyId: company1.id },
          { categoryCode: 'EXPC-0005', name: 'Material Purchase', description: 'Project material emergency purchases', approvalRequired: true, status: 'Active', CompanyId: company1.id },
          { categoryCode: 'EXPC-0006', name: 'Labour', description: 'Daily wage worker payments', approvalRequired: true, status: 'Active', CompanyId: company1.id },
          { categoryCode: 'EXPC-0007', name: 'Courier', description: 'Postal and dispatch charges', approvalRequired: false, status: 'Active', CompanyId: company1.id },
          { categoryCode: 'EXPC-0008', name: 'Site Expenses', description: 'On-site miscellaneous tools & supplies', approvalRequired: true, status: 'Active', CompanyId: company1.id },
          { categoryCode: 'EXPC-0009', name: 'Vehicle Expense', description: 'Official car servicing & maintenance', approvalRequired: true, status: 'Active', CompanyId: company1.id },
          { categoryCode: 'EXPC-0010', name: 'Miscellaneous', description: 'General office petty cash expenditures', approvalRequired: false, status: 'Active', CompanyId: company1.id }
        ];
        await ExpenseCategory.bulkCreate(categories);
        console.log('Seed: Default Expense Categories seeded.');
      }
    }

    // Seed default warehouses if none exist
    const warehouseCount = await Warehouse.count();
    if (warehouseCount === 0) {
      const company1 = await Company.findOne();
      if (company1) {
        const branch1 = await Branch.findOne({ where: { CompanyId: company1.id } });
        const branchId = branch1 ? branch1.id : null;
        if (branchId) {
          const warehouses = [
            {
              warehouseCode: 'WH-0001',
              name: 'Main Warehouse',
              warehouseType: 'Main',
              country: 'India',
              state: 'Karnataka',
              city: 'Bengaluru',
              addressLine1: 'MG Road, Bangalore',
              defaultWarehouse: true,
              BranchId: branchId,
              CompanyId: company1.id,
              status: 'Active'
            },
            {
              warehouseCode: 'WH-0002',
              name: 'Transit Depot',
              warehouseType: 'Transit',
              country: 'India',
              state: 'Maharashtra',
              city: 'Mumbai',
              addressLine1: 'Andheri West, Mumbai',
              defaultWarehouse: false,
              BranchId: branchId,
              CompanyId: company1.id,
              status: 'Active'
            }
          ];
          await Warehouse.bulkCreate(warehouses);
          console.log('Seed: Default Warehouses seeded.');
        } else {
          console.log('Seed: Could not seed warehouses - no branch found.');
        }
      }
    }

    // Seed default items if none exist
    const itemCount = await Item.count();
    if (itemCount === 0) {
      const company1 = await Company.findOne();
      if (company1) {
        const catElectrical = await ItemCategory.findOne({ where: { name: 'Electrical', CompanyId: company1.id } });
        const catMechanical = await ItemCategory.findOne({ where: { name: 'Mechanical', CompanyId: company1.id } });

        const items = [
          {
            itemCode: 'ITEM-0001',
            name: 'Copper Wire 1.5 Sqmm',
            ItemCategoryId: catElectrical ? catElectrical.id : null,
            unit: 'Mtr',
            purchasePrice: 12.00,
            sellingPrice: 18.00,
            gstPercent: 18.00,
            hsnSacCode: '8544',
            description: '1.5 Sqmm single core copper wire',
            status: 'Active',
            CompanyId: company1.id
          },
          {
            itemCode: 'ITEM-0002',
            name: 'Stainless Steel Bolt M10',
            ItemCategoryId: catMechanical ? catMechanical.id : null,
            unit: 'Nos',
            purchasePrice: 15.00,
            sellingPrice: 25.00,
            gstPercent: 18.00,
            hsnSacCode: '7318',
            description: 'M10 grade stainless steel bolt',
            status: 'Active',
            CompanyId: company1.id
          }
        ];
        await Item.bulkCreate(items);
        console.log('Seed: Default Items seeded.');
      }
    }

    // Seed default locations if none exist
    const locationCount = await Location.count();
    if (locationCount === 0) {
      const company1 = await Company.findOne();
      if (company1) {
        const warehouse1 = await Warehouse.findOne({ where: { name: 'Main Warehouse', CompanyId: company1.id } });
        if (warehouse1) {
          const locations = [
            {
              locationCode: 'LOC-0001',
              name: 'Rack A-01',
              locationType: 'Storage',
              zone: 'Zone A',
              aisle: 'A1',
              rack: 'R1',
              shelf: 'S1',
              bin: 'B1',
              capacity: 100,
              capacityUnit: 'Pieces',
              barcode: 'BAR-LOC-0001',
              allowMixedItems: true,
              tempControlled: false,
              hazardousStorage: false,
              pickSequence: 1,
              putawaySequence: 1,
              status: 'Active',
              WarehouseId: warehouse1.id,
              CompanyId: company1.id
            },
            {
              locationCode: 'LOC-0002',
              name: 'Bin 12',
              locationType: 'Storage',
              zone: 'Zone B',
              aisle: 'A2',
              rack: 'R2',
              shelf: 'S2',
              bin: 'B12',
              capacity: 50,
              capacityUnit: 'Boxes',
              barcode: 'BAR-LOC-0002',
              allowMixedItems: false,
              tempControlled: false,
              hazardousStorage: false,
              pickSequence: 2,
              putawaySequence: 2,
              status: 'Active',
              WarehouseId: warehouse1.id,
              CompanyId: company1.id
            }
          ];
          await Location.bulkCreate(locations);
          console.log('Seed: Default Locations seeded.');
        } else {
          console.log('Seed: Could not seed locations - no warehouse found.');
        }
      }
    }

    // Seed default service categories if none exist
    const serviceCategoryCount = await ServiceCategory.count();
    if (serviceCategoryCount === 0) {
      const company1 = await Company.findOne();
      if (company1) {
        const parentIT = await ServiceCategory.create({
          categoryCode: 'SVCC-0001',
          name: 'IT Services',
          description: 'General Information Technology services',
          status: 'Active',
          CompanyId: company1.id
        });

        await ServiceCategory.create({
          categoryCode: 'SVCC-0002',
          name: 'Software Development',
          description: 'Web, mobile, and custom application development',
          ParentId: parentIT.id,
          status: 'Active',
          CompanyId: company1.id
        });

        await ServiceCategory.create({
          categoryCode: 'SVCC-0003',
          name: 'App Development',
          description: 'Native and cross-platform mobile apps',
          ParentId: parentIT.id,
          status: 'Active',
          CompanyId: company1.id
        });

        console.log('Seed: Default Service Categories and Subcategories seeded.');
      }
    }

    // Seed default AMC categories if none exist
    const amcCategoryCount = await AmcCategory.count();
    if (amcCategoryCount === 0) {
      const company1 = await Company.findOne();
      if (company1) {
        const categories = [
          { categoryCode: 'AMC-0001', name: 'Comprehensive AMC', description: 'Covers preventive maintenance and service support', defaultDuration: '12 Months', status: 'Active', CompanyId: company1.id },
          { categoryCode: 'AMC-0002', name: 'Non-Comprehensive AMC', description: 'Service support excluding parts', defaultDuration: '12 Months', status: 'Active', CompanyId: company1.id },
          { categoryCode: 'AMC-0003', name: 'Preventive Maintenance', description: 'Scheduled health check and preventive visits', defaultDuration: '6 Months', status: 'Active', CompanyId: company1.id }
        ];
        await AmcCategory.bulkCreate(categories);
        console.log('Seed: Default AMC Categories seeded.');
      }
    }

    // Seed default vehicles if none exist
    const vehicleCount = await Vehicle.count();
    if (vehicleCount === 0) {
      const company1 = await Company.findOne();
      if (company1) {
        const branch1 = await Branch.findOne({ where: { CompanyId: company1.id } });
        const driver = await EmployeeMaster.findOne({ where: { CompanyId: company1.id } });
        const vehicles = [
          {
            vehicleCode: 'VEH-0001',
            vehicleNumber: 'KA01AB1234',
            vehicleName: 'Site Visit Car',
            vehicleType: 'Car',
            brand: 'Maruti Suzuki',
            model: 'Dzire',
            fuelType: 'Petrol',
            color: 'White',
            manufacturingYear: 2024,
            BranchId: branch1 ? branch1.id : null,
            AssignedDriverId: driver ? driver.id : null,
            status: 'Active',
            remarks: 'Default company vehicle',
            createdBy: 'seed',
            CompanyId: company1.id
          }
        ];
        await Vehicle.bulkCreate(vehicles);
        console.log('Seed: Default Vehicles seeded.');
      }
    }

    // Seed default assets if none exist
    const assetCount = await Asset.count();
    if (assetCount === 0) {
      const company1 = await Company.findOne();
      if (company1) {
        const branch1 = await Branch.findOne({ where: { CompanyId: company1.id } });
        const employee = await EmployeeMaster.findOne({ where: { CompanyId: company1.id } });
        const vendor = await Vendor.findOne({ where: { CompanyId: company1.id } });
        const location = await Location.findOne({ where: { CompanyId: company1.id } });
        const assets = [
          {
            assetCode: 'AST-0001',
            assetName: 'Developer Laptop',
            assetCategory: 'IT Equipment',
            brand: 'HP',
            model: 'ProBook 450 G9',
            serialNumber: 'HP123456789',
            BranchId: branch1 ? branch1.id : null,
            AssignedEmployeeId: employee ? employee.id : null,
            VendorId: vendor ? vendor.id : null,
            LocationId: location ? location.id : null,
            assetStatus: 'Active',
            description: 'Seeded asset for testing',
            createdBy: 'seed',
            CompanyId: company1.id
          }
        ];
        await Asset.bulkCreate(assets);
        console.log('Seed: Default Assets seeded.');
      }
    }

    // Seed default leads if none exist
    const leadCount = await Lead.count();
    if (leadCount === 0) {
      const company1 = await Company.findOne();
      if (company1) {
        const employee = await EmployeeMaster.findOne({ where: { CompanyId: company1.id } });
        const leads = [
          {
            leadCode: 'LED-0001',
            leadTitle: 'Enterprise ERP Implementation',
            companyName: 'Acme Corporates',
            contactName: 'John Doe',
            email: 'john@acme.com',
            phone: '9876543210',
            leadSource: 'Website',
            leadStatus: 'New',
            estimatedValue: 15000.00,
            AssignedToId: employee ? employee.id : null,
            description: 'Interested in implementing customized CRM + ERP module.',
            CompanyId: company1.id
          }
        ];
        await Lead.bulkCreate(leads);
        console.log('Seed: Default Leads seeded.');
      }
    }
  } catch (error) {
    console.warn('Seeding warning:', error.message);
  }
};

// Database Connection & Server Start
const startServer = async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connected.');
    await sequelize.sync({ alter: true });
    console.log('Database schema synchronized.');
    // Run DB enum column sync query for MasterFields.module
    try {
      await sequelize.query("ALTER TABLE MasterFields MODIFY COLUMN module ENUM('Customer','Vendor','Employee','Project','Department','Designation','ItemCategory','Item','User','Branch','ERP','Unit','ExpenseCategory','Warehouse','Location','ServiceCategory','AmcCategory','Vehicle','Asset','Lead','Enquiry','Quotation','SalesOrder','CustomerPO','DispatchPlan','DeliveryTracking','Invoice','CreditNote','DebitNote','SalesReturn','VendorEnquiry','VendorQuotation','PurchaseRequisition','PurchaseApproval','PurchaseOrder','GoodsReceiptNote','VendorBill','VendorPayment') NOT NULL");
      console.log('MasterFields module ENUM updated in DB.');
    } catch (e) {
      console.warn('ENUM update query warning:', e.message);
    }
    // Check if there are corrupted fields (empty module)
    const [corrupted] = await sequelize.query("SELECT id FROM MasterFields WHERE module = '' LIMIT 1");
    if (corrupted.length > 0) {
      console.log('Corrupted MasterFields entries found, performing one-time cleanup...');
      await sequelize.query("DELETE FROM MasterFields WHERE module = '' OR module = 'Department' OR module = 'Designation'");
      console.log('Cleanup completed.');
    }
    await seedDatabase();
    app.listen(PORT, () => {
      console.log(`SaaS Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Database connection error:', error);
    app.listen(PORT, () => {
      console.log(`SaaS Server running on port ${PORT} (DB Offline)`);
    });
  }
};

startServer();
