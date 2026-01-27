import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { 
  LayoutDashboard, FileSpreadsheet, FileText, BookOpen, BarChart3, Settings,
  Upload, Eye, FileImage, Receipt, Mail, ChevronRight, Plus, Download,
  CheckCircle2, Clock, AlertCircle, Send, CreditCard, Building2, Calendar,
  DollarSign, Users, TrendingUp, ArrowUpRight, ArrowDownRight, Filter,
  Search, X, Check, Printer, RefreshCw, Trash2, Image, Merge, FileCheck,
  ChevronDown, ChevronUp, Square, CheckSquare, Layers, Menu, ChevronLeft,
  Edit2, Save, ExternalLink, Clipboard, Table, Link2, Camera, FileDown, PlusCircle,
  MessageSquare, ThumbsUp, Edit3, Loader2
} from 'lucide-react';
import { saveAppState, loadAppState } from './firebase';

// ============================================
// UTILITY FUNCTIONS
// ============================================

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount || 0);
};

const formatCurrencyShort = (amount) => {
  return '₹' + new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount || 0);
};

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  const day = date.getDate().toString().padStart(2, '0');
  const month = date.toLocaleString('en-US', { month: 'short' });
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
};

const formatDateOrdinal = (dateStr) => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  const day = date.getDate();
  const month = date.toLocaleString('en-US', { month: 'short' });
  const year = date.getFullYear();
  const ordinal = (d) => {
    if (d > 3 && d < 21) return 'th';
    switch (d % 10) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  };
  return `${day}${ordinal(day)} ${month}, ${year}`;
};

const numberToWords = (num) => {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  
  if (num === 0) return 'Zero';
  
  const convertLessThanThousand = (n) => {
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
    return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + convertLessThanThousand(n % 100) : '');
  };
  
  const convert = (n) => {
    if (n < 1000) return convertLessThanThousand(n);
    if (n < 100000) return convertLessThanThousand(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + convertLessThanThousand(n % 1000) : '');
    if (n < 10000000) return convertLessThanThousand(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + convert(n % 100000) : '');
    return convertLessThanThousand(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + convert(n % 10000000) : '');
  };
  
  const rupees = Math.floor(num);
  const paise = Math.round((num - rupees) * 100);
  
  let result = 'INR ' + convert(rupees);
  if (paise > 0) {
    result += ' and ' + convert(paise) + ' Paise';
  }
  return result + ' Only';
};

const extractEmail = (text) => {
  if (!text) return '';
  const emailRegex = /[\w.-]+@[\w.-]+\.\w+/g;
  const matches = text.match(emailRegex);
  return matches ? matches[0] : '';
};

const getStatusColor = (status) => {
  const colors = {
    'Approved': { bg: '#DCFCE7', text: '#166534', border: '#86EFAC' },
    'Created': { bg: '#DBEAFE', text: '#1E40AF', border: '#93C5FD' },
    'Need Edits': { bg: '#FEE2E2', text: '#991B1B', border: '#FCA5A5' },
    'Paid': { bg: '#D1FAE5', text: '#065F46', border: '#6EE7B7' },
    'Individual': { bg: '#E0E7FF', text: '#3730A3', border: '#A5B4FC' },
    'Combined': { bg: '#F3E8FF', text: '#6B21A8', border: '#DDD6FE' },
    'Yes': { bg: '#DCFCE7', text: '#166534', border: '#86EFAC' },
    'No': { bg: '#FEF3C7', text: '#92400E', border: '#FCD34D' },
    'Not Yet': { bg: '#F1F5F9', text: '#475569', border: '#CBD5E1' },
    'Pending': { bg: '#FEF3C7', text: '#92400E', border: '#FCD34D' },
    'Sent': { bg: '#D1FAE5', text: '#065F46', border: '#6EE7B7' }
  };
  return colors[status] || { bg: '#F1F5F9', text: '#475569', border: '#CBD5E1' };
};

// ============================================
// COMPONENTS
// ============================================

const StatusBadge = ({ status, small = false }) => {
  const colors = getStatusColor(status);
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: small ? '2px 8px' : '4px 12px',
      borderRadius: '6px',
      fontSize: small ? '11px' : '12px',
      fontWeight: '600',
      backgroundColor: colors.bg,
      color: colors.text,
      border: `1px solid ${colors.border}`,
    }}>
      {status}
    </span>
  );
};

const ActionButton = ({ icon: Icon, label, onClick, variant = 'default', disabled = false, small = false }) => {
  const variants = {
    default: { bg: '#F8FAFC', hoverBg: '#E2E8F0', text: '#475569', border: '#CBD5E1' },
    primary: { bg: '#2874A6', hoverBg: '#1a5276', text: '#FFFFFF', border: '#2874A6' },
    success: { bg: '#059669', hoverBg: '#047857', text: '#FFFFFF', border: '#059669' },
    warning: { bg: '#D97706', hoverBg: '#B45309', text: '#FFFFFF', border: '#D97706' },
    danger: { bg: '#DC2626', hoverBg: '#B91C1C', text: '#FFFFFF', border: '#DC2626' },
    brand: { bg: '#2874A6', hoverBg: '#1a5276', text: '#FFFFFF', border: '#2874A6' },
    purple: { bg: '#7C3AED', hoverBg: '#6D28D9', text: '#FFFFFF', border: '#7C3AED' }
  };
  const v = variants[variant];
  
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: small ? '5px 10px' : '8px 14px',
        borderRadius: '6px',
        fontSize: small ? '11px' : '13px',
        fontWeight: '600',
        backgroundColor: disabled ? '#F1F5F9' : v.bg,
        color: disabled ? '#94A3B8' : v.text,
        border: `1px solid ${disabled ? '#E2E8F0' : v.border}`,
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.15s ease',
        whiteSpace: 'nowrap',
        opacity: disabled ? 0.6 : 1
      }}
      onMouseEnter={(e) => !disabled && (e.target.style.backgroundColor = v.hoverBg)}
      onMouseLeave={(e) => !disabled && (e.target.style.backgroundColor = v.bg)}
    >
      {Icon && <Icon size={small ? 14 : 16} />}
      {label && <span>{label}</span>}
    </button>
  );
};

const InputField = ({ label, type = 'text', value, onChange, placeholder, disabled, small }) => (
  <div style={{ marginBottom: small ? '12px' : '16px' }}>
    {label && <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>{label}</label>}
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      style={{
        width: '100%',
        padding: small ? '8px 12px' : '10px 14px',
        borderRadius: '8px',
        border: '1.5px solid #D1D5DB',
        fontSize: small ? '13px' : '14px',
        backgroundColor: disabled ? '#F9FAFB' : '#FFFFFF',
        boxSizing: 'border-box'
      }}
    />
  </div>
);

const SelectField = ({ label, value, onChange, options, small }) => (
  <div style={{ marginBottom: small ? '12px' : '16px' }}>
    {label && <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>{label}</label>}
    <select
      value={value}
      onChange={onChange}
      style={{
        width: '100%',
        padding: small ? '8px 12px' : '10px 14px',
        borderRadius: '8px',
        border: '1.5px solid #D1D5DB',
        fontSize: small ? '13px' : '14px',
        backgroundColor: '#FFFFFF',
        boxSizing: 'border-box'
      }}
    >
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  </div>
);

const Card = ({ title, children, actions, noPadding = false }) => (
  <div style={{
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    border: '1px solid #E2E8F0',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    overflow: 'hidden'
  }}>
    {title && (
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '14px 20px',
        borderBottom: '1px solid #E2E8F0',
        backgroundColor: '#FAFBFC'
      }}>
        <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#1E293B' }}>{title}</h3>
        {actions && <div style={{ display: 'flex', gap: '10px' }}>{actions}</div>}
      </div>
    )}
    <div style={{ padding: noPadding ? 0 : '20px' }}>
      {children}
    </div>
  </div>
);

const Modal = ({ isOpen, onClose, title, children, width = '500px' }) => {
  if (!isOpen) return null;
  
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.6)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      backdropFilter: 'blur(4px)'
    }} onClick={onClose}>
      <div style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '16px',
        width: width,
        maxWidth: '95vw',
        maxHeight: '90vh',
        overflow: 'hidden',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
      }} onClick={(e) => e.stopPropagation()}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 20px',
          borderBottom: '1px solid #E2E8F0',
          backgroundColor: '#FAFBFC'
        }}>
          <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#1E293B' }}>{title}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#64748B' }}>
            <X size={20} />
          </button>
        </div>
        <div style={{ padding: '20px', maxHeight: 'calc(90vh - 100px)', overflowY: 'auto' }}>
          {children}
        </div>
      </div>
    </div>
  );
};

// ============================================

// ============================================
// MAIN APP COMPONENT
// ============================================

export default function FinanceApp() {
  // Login State
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  
  // User credentials
  const users = {
    finance: { password: 'finance123', role: 'finance', name: 'Finance Team' },
    director: { password: 'director123', role: 'director', name: 'Director' }
  };

  const [companyConfig, setCompanyConfig] = useState({
    name: 'INDREESH MEDIA LLP',
    brand: 'MEDIABRIEF',
    address: 'A-1701 Sweet Home CHS LTD, SVP, Plot No: 24',
    addressLine2: 'Andheri West, Nr Last Bus St',
    city: 'Mumbai-400053',
    gstin: '27AAIFI6351A1ZM',
    stateCode: '27',
    stateName: 'Maharashtra',
    email: 'alliances@mediabrief.com',
    phone: '+91 7021911036',
    website: 'www.mediabrief.com',
    pan: 'AAIFI6351A',
    bank: {
      name: 'Axis Bank',
      account: '921020009075531',
      branch: 'Andheri',
      ifsc: 'UTIB0000020',
      holder: 'INDREESH MEDIA LLP'
    },
    invoicePrefix: 'MB/2025-26/',
    hsnCode: '998365',
    gstRate: 18
  });

  const [activeMenu, setActiveMenu] = useState('master');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  const [masterData, setMasterData] = useState([]);
  const [ledgerEntries, setLedgerEntries] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [creditNotes, setCreditNotes] = useState([]);
  const [selectedParty, setSelectedParty] = useState(null);
  const [nextInvoiceNo, setNextInvoiceNo] = useState(1);
  const [nextCombineNo, setNextCombineNo] = useState(1);
  const [nextReceiptNo, setNextReceiptNo] = useState(1);
  const [nextCreditNoteNo, setNextCreditNoteNo] = useState(1);
  
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showOpeningBalanceModal, setShowOpeningBalanceModal] = useState(false);
  const [showCombineModal, setShowCombineModal] = useState(false);
  const [showAddEmailModal, setShowAddEmailModal] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showCreditNoteModal, setShowCreditNoteModal] = useState(false);
  const [showClearDataModal, setShowClearDataModal] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [emailMode, setEmailMode] = useState('reply');
  const [newEmailInput, setNewEmailInput] = useState('');
  const [editComments, setEditComments] = useState('');
  
  const [receiptForm, setReceiptForm] = useState({
    amount: '', tds: '', discount: '', narration: '', paymentAdvisory: null,
    date: new Date().toISOString().split('T')[0], mode: 'Bank'
  });
  
  const [creditNoteForm, setCreditNoteForm] = useState({
    amount: '', reason: '', date: new Date().toISOString().split('T')[0]
  });
  
  const [approvalChecks, setApprovalChecks] = useState({
    particularsApproved: false, emailApproved: false, invoiceTypeApproved: false
  });
  
  const [combineParty, setCombineParty] = useState(null);
  const [selectedForCombine, setSelectedForCombine] = useState(new Set());
  
  const [mailerImages, setMailerImages] = useState({});
  const [mailerLogo, setMailerLogo] = useState(null);
  const [pastedImage, setPastedImage] = useState(null);
  const [replaceMode, setReplaceMode] = useState(false);
  
  const [openingBalances, setOpeningBalances] = useState({});
  const [openingBalanceForm, setOpeningBalanceForm] = useState({ partyName: '', amount: '', type: 'Dr' });
  const [invoiceValues, setInvoiceValues] = useState({});
  
  const [expandedParties, setExpandedParties] = useState(new Set());
  
  const [filters, setFilters] = useState({
    party: '', billStatus: '', invoiceStatus: '', mailingStatus: '', invoiceType: '', combinationCode: '', searchText: ''
  });
  
  const [paymentForm, setPaymentForm] = useState({
    amount: '', date: new Date().toISOString().split('T')[0], mode: 'Bank', tds: '', discount: '', narration: ''
  });
  
  const excelInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const logoInputRef = useRef(null);
  const invoiceValueInputRef = useRef(null);
  const pasteAreaRef = useRef(null);
  const paymentAdvisoryRef = useRef(null);
  const saveTimeoutRef = useRef(null);

  // ============================================
  // FIREBASE DATA PERSISTENCE
  // ============================================
  
  // Load data from Firebase on login
  const loadDataFromFirebase = async () => {
    setIsLoading(true);
    try {
      const data = await loadAppState('indreesh-media');
      if (data) {
        if (data.masterData) setMasterData(data.masterData);
        if (data.ledgerEntries) setLedgerEntries(data.ledgerEntries);
        if (data.receipts) setReceipts(data.receipts);
        if (data.creditNotes) setCreditNotes(data.creditNotes);
        if (data.openingBalances) setOpeningBalances(data.openingBalances);
        if (data.mailerImages) setMailerImages(data.mailerImages);
        if (data.mailerLogo) setMailerLogo(data.mailerLogo);
        if (data.companyConfig) setCompanyConfig(prev => ({ ...prev, ...data.companyConfig }));
        if (data.nextInvoiceNo) setNextInvoiceNo(data.nextInvoiceNo);
        if (data.nextCombineNo) setNextCombineNo(data.nextCombineNo);
        if (data.nextReceiptNo) setNextReceiptNo(data.nextReceiptNo);
        if (data.nextCreditNoteNo) setNextCreditNoteNo(data.nextCreditNoteNo);
        if (data.invoiceValues) setInvoiceValues(data.invoiceValues);
        console.log('Data loaded from Firebase');
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
    setIsLoading(false);
  };

  // Save data to Firebase (debounced)
  const saveDataToFirebase = useCallback(async () => {
    setIsSaving(true);
    try {
      await saveAppState('indreesh-media', {
        masterData,
        ledgerEntries,
        receipts,
        creditNotes,
        openingBalances,
        mailerImages,
        mailerLogo,
        companyConfig,
        nextInvoiceNo,
        nextCombineNo,
        nextReceiptNo,
        nextCreditNoteNo,
        invoiceValues
      });
      setLastSaved(new Date());
      console.log('Data saved to Firebase');
    } catch (error) {
      console.error('Error saving data:', error);
    }
    setIsSaving(false);
  }, [masterData, ledgerEntries, receipts, creditNotes, openingBalances, mailerImages, mailerLogo, companyConfig, nextInvoiceNo, nextCombineNo, nextReceiptNo, nextCreditNoteNo, invoiceValues]);

  // Auto-save when data changes (debounced 2 seconds)
  useEffect(() => {
    if (!isLoggedIn) return;
    
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = setTimeout(() => {
      saveDataToFirebase();
    }, 2000);
    
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [masterData, ledgerEntries, receipts, creditNotes, openingBalances, mailerImages, mailerLogo, companyConfig, nextInvoiceNo, nextCombineNo, nextReceiptNo, nextCreditNoteNo, invoiceValues, isLoggedIn]);

  // ============================================
  // LOGIN HANDLING
  // ============================================
  
  const handleLogin = async () => {
    const user = users[loginForm.username.toLowerCase()];
    if (user && user.password === loginForm.password) {
      setIsLoggedIn(true);
      setUserRole(user.role);
      setLoginError('');
      setLoginForm({ username: '', password: '' });
      await loadDataFromFirebase();
    } else {
      setLoginError('Invalid username or password');
    }
  };

  const handleLogout = () => {
    saveDataToFirebase();
    setIsLoggedIn(false);
    setUserRole(null);
    setActiveMenu('master');
  };

  const canEdit = userRole === 'finance';
  const isDirector = userRole === 'director';
  // ============================================
  // COMPUTED VALUES
  // ============================================
  
  const parties = useMemo(() => {
    const uniqueParties = [...new Set(masterData.map(r => r.partyName))];
    return uniqueParties.filter(Boolean);
  }, [masterData]);

  const combinationCodes = useMemo(() => {
    const codes = [...new Set(masterData.filter(r => r.combinationCode && r.combinationCode !== 'NA').map(r => r.combinationCode))];
    return codes.sort((a, b) => parseInt(a) - parseInt(b));
  }, [masterData]);

  const filteredData = useMemo(() => {
    return masterData.filter(row => {
      if (filters.party && row.partyName !== filters.party) return false;
      if (filters.billStatus && row.toBeBilled !== filters.billStatus) return false;
      if (filters.invoiceStatus) {
        if (filters.invoiceStatus === 'Generated' && !row.invoiceGenerated) return false;
        if (filters.invoiceStatus === 'Not Generated' && row.invoiceGenerated) return false;
        if (filters.invoiceStatus === 'Paid' && row.invoiceStatus !== 'Paid') return false;
      }
      if (filters.mailingStatus && row.mailingSent !== filters.mailingStatus) return false;
      if (filters.invoiceType && row.invoiceType !== filters.invoiceType) return false;
      if (filters.combinationCode && row.combinationCode !== filters.combinationCode) return false;
      if (filters.searchText) {
        const search = filters.searchText.toLowerCase();
        const matchesSearch = 
          (row.senderName?.toLowerCase().includes(search)) ||
          (row.subject?.toLowerCase().includes(search)) ||
          (row.campaignName?.toLowerCase().includes(search)) ||
          (row.invoiceNo?.toLowerCase().includes(search)) ||
          (row.partyName?.toLowerCase().includes(search)) ||
          (row.emailId?.toLowerCase().includes(search));
        if (!matchesSearch) return false;
      }
      return true;
    });
  }, [masterData, filters]);

  const groupedData = useMemo(() => {
    const groups = {};
    filteredData.forEach(row => {
      if (!groups[row.partyName]) groups[row.partyName] = [];
      groups[row.partyName].push(row);
    });
    Object.keys(groups).forEach(party => {
      groups[party].sort((a, b) => {
        if (a.toBeBilled === 'Yes' && b.toBeBilled !== 'Yes') return -1;
        if (a.toBeBilled !== 'Yes' && b.toBeBilled === 'Yes') return 1;
        return 0;
      });
    });
    return groups;
  }, [filteredData]);

  const partyLedger = useMemo(() => {
    if (!selectedParty) return [];
    const openingBal = openingBalances[selectedParty] || 0;
    let balance = openingBal;
    const entries = ledgerEntries
      .filter(e => e.partyName === selectedParty)
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .map(entry => {
        balance = balance + entry.debit - entry.credit;
        return { ...entry, balance };
      });
    if (openingBal !== 0) {
      return [
        { id: 'opening', date: '', particulars: 'Opening Balance', debit: openingBal > 0 ? openingBal : 0, credit: openingBal < 0 ? Math.abs(openingBal) : 0, balance: openingBal, isOpening: true },
        ...entries
      ];
    }
    return entries;
  }, [selectedParty, ledgerEntries, openingBalances]);

  const getUnbilledCampaignsForParty = (partyName) => {
    return masterData.filter(r => 
      r.partyName === partyName && 
      r.toBeBilled === 'Yes' && 
      !r.invoiceGenerated &&
      r.invoiceAmount
    );
  };

  const isCombinedMailSent = (combinationCode) => {
    if (!combinationCode || combinationCode === 'NA') return false;
    return masterData.some(r => r.combinationCode === combinationCode && r.mailingSent === 'Yes');
  };

  // Get all campaigns for a combined invoice
  const getCombinedCampaigns = (row) => {
    if (row.invoiceType === 'Combined' && row.combinationCode !== 'NA') {
      return masterData.filter(r => r.combinationCode === row.combinationCode);
    }
    return [row];
  };

  const clearFilters = () => {
    setFilters({ party: '', billStatus: '', invoiceStatus: '', mailingStatus: '', invoiceType: '', combinationCode: '', searchText: '' });
  };

  const hasActiveFilters = Object.values(filters).some(v => v !== '');

  // ============================================
  // EMAIL HANDLING
  // ============================================
  
  const getAllEmails = (row) => {
    const emails = [];
    if (row.emailId) emails.push(row.emailId);
    if (row.additionalEmails && row.additionalEmails.length > 0) {
      emails.push(...row.additionalEmails);
    }
    return emails;
  };

  const addEmailToRow = (rowId, email) => {
    if (!email || !email.includes('@')) return;
    setMasterData(prev => prev.map(r => {
      if (r.id === rowId) {
        const existing = r.additionalEmails || [];
        if (!existing.includes(email) && email !== r.emailId) {
          return { ...r, additionalEmails: [...existing, email] };
        }
      }
      return r;
    }));
  };

  const removeEmailFromRow = (rowId, email) => {
    setMasterData(prev => prev.map(r => {
      if (r.id === rowId) {
        return { ...r, additionalEmails: (r.additionalEmails || []).filter(e => e !== email) };
      }
      return r;
    }));
  };

  // ============================================
  // APPROVAL HANDLING - ENHANCED WITH 3 APPROVALS
  // ============================================
  
  const openApprovalModal = (row) => {
    setSelectedRow(row);
    setEditComments(row.editComments || '');
    setApprovalChecks({
      particularsApproved: row.particularsApproved || false,
      emailApproved: row.emailApproved || false,
      invoiceTypeApproved: row.invoiceTypeApproved || false
    });
    setShowApprovalModal(true);
  };

  const handleApprove = () => {
    if (!selectedRow) return;
    
    // Check if all approvals are given
    if (!approvalChecks.particularsApproved || !approvalChecks.emailApproved || !approvalChecks.invoiceTypeApproved) {
      alert('Please confirm all approval checkboxes before approving.');
      return;
    }
    
    const approvalData = {
      invoiceStatus: 'Approved',
      editComments: '',
      particularsApproved: true,
      emailApproved: true,
      invoiceTypeApproved: true,
      approvedBy: userRole,
      approvedDate: new Date().toISOString()
    };
    
    if (selectedRow.invoiceType === 'Combined' && selectedRow.combinationCode !== 'NA') {
      setMasterData(prev => prev.map(r => 
        r.combinationCode === selectedRow.combinationCode 
          ? { ...r, ...approvalData } 
          : r
      ));
    } else {
      setMasterData(prev => prev.map(r => 
        r.id === selectedRow.id 
          ? { ...r, ...approvalData } 
          : r
      ));
    }
    setShowApprovalModal(false);
    setSelectedRow(null);
    setApprovalChecks({ particularsApproved: false, emailApproved: false, invoiceTypeApproved: false });
    alert('✅ Invoice Approved!\n\nThe invoice is now ready for mailing.');
  };

  const handleNeedEdits = () => {
    if (!selectedRow || !editComments.trim()) {
      alert('Please add comments for the required edits');
      return;
    }
    
    if (selectedRow.invoiceType === 'Combined' && selectedRow.combinationCode !== 'NA') {
      setMasterData(prev => prev.map(r => 
        r.combinationCode === selectedRow.combinationCode 
          ? { ...r, invoiceStatus: 'Need Edits', editComments: editComments } 
          : r
      ));
    } else {
      setMasterData(prev => prev.map(r => 
        r.id === selectedRow.id 
          ? { ...r, invoiceStatus: 'Need Edits', editComments: editComments } 
          : r
      ));
    }
    setShowApprovalModal(false);
    setSelectedRow(null);
    setEditComments('');
  };

  // ============================================
  // RECEIPT HANDLING
  // ============================================
  
  const openReceiptModal = (row) => {
    setSelectedRow(row);
    const totalAmount = parseFloat(row.invoiceTotalAmount) || 0;
    setReceiptForm({
      amount: totalAmount.toFixed(2),
      tds: '',
      discount: '',
      narration: '',
      paymentAdvisory: null,
      date: new Date().toISOString().split('T')[0],
      mode: 'Bank'
    });
    setShowReceiptModal(true);
  };

  const handleReceiptSubmit = () => {
    if (!selectedRow || !receiptForm.amount) {
      alert('Please enter receipt amount');
      return;
    }
    
    const receiptNo = `RCP/${new Date().getFullYear()}-${String(new Date().getFullYear() + 1).slice(-2)}/${nextReceiptNo}`;
    const receiptAmount = parseFloat(receiptForm.amount) || 0;
    const tdsAmount = parseFloat(receiptForm.tds) || 0;
    const discountAmount = parseFloat(receiptForm.discount) || 0;
    const totalCredit = receiptAmount + tdsAmount + discountAmount;
    
    // Get campaign subject for narration
    const campaigns = getCombinedCampaigns(selectedRow);
    const campaignSubjects = campaigns.map(c => c.subject || c.senderName).join(', ');
    const shortNarration = campaignSubjects.length > 50 ? campaignSubjects.substring(0, 47) + '...' : campaignSubjects;
    
    const newReceipt = {
      id: Date.now(),
      receiptNo,
      invoiceNo: selectedRow.invoiceNo,
      partyName: selectedRow.partyName,
      date: receiptForm.date,
      amount: receiptAmount,
      tds: tdsAmount,
      discount: discountAmount,
      totalCredit,
      narration: receiptForm.narration,
      paymentAdvisory: receiptForm.paymentAdvisory,
      mode: receiptForm.mode,
      campaigns: campaigns.map(c => ({ senderName: c.senderName, subject: c.subject }))
    };
    
    setReceipts(prev => [...prev, newReceipt]);
    
    // Add to ledger - Promotional Trade Mailer as particulars
    const ledgerNarration = receiptForm.narration ? `${shortNarration} | ${receiptForm.narration}` : shortNarration;
    
    if (receiptAmount > 0) {
      setLedgerEntries(prev => [...prev, {
        id: Date.now(),
        partyName: selectedRow.partyName,
        date: receiptForm.date,
        particulars: 'Promotional Trade Mailer',
        narration: ledgerNarration,
        debit: 0,
        credit: receiptAmount,
        type: 'receipt',
        receiptNo,
        invoiceNo: selectedRow.invoiceNo
      }]);
    }
    
    if (tdsAmount > 0) {
      setLedgerEntries(prev => [...prev, {
        id: Date.now() + 1,
        partyName: selectedRow.partyName,
        date: receiptForm.date,
        particulars: 'TDS Deducted',
        narration: `Against ${selectedRow.invoiceNo}`,
        debit: 0,
        credit: tdsAmount,
        type: 'tds',
        receiptNo,
        invoiceNo: selectedRow.invoiceNo
      }]);
    }
    
    if (discountAmount > 0) {
      setLedgerEntries(prev => [...prev, {
        id: Date.now() + 2,
        partyName: selectedRow.partyName,
        date: receiptForm.date,
        particulars: 'Discount Given',
        narration: `Against ${selectedRow.invoiceNo}`,
        debit: 0,
        credit: discountAmount,
        type: 'discount',
        receiptNo,
        invoiceNo: selectedRow.invoiceNo
      }]);
    }
    
    // Update invoice receipt status
    if (selectedRow.invoiceType === 'Combined' && selectedRow.combinationCode !== 'NA') {
      setMasterData(prev => prev.map(r => 
        r.combinationCode === selectedRow.combinationCode 
          ? { ...r, receiptStatus: 'Received', receiptNo, receiptDate: receiptForm.date } 
          : r
      ));
    } else {
      setMasterData(prev => prev.map(r => 
        r.id === selectedRow.id 
          ? { ...r, receiptStatus: 'Received', receiptNo, receiptDate: receiptForm.date } 
          : r
      ));
    }
    
    setNextReceiptNo(prev => prev + 1);
    setShowReceiptModal(false);
    setSelectedRow(null);
    setReceiptForm({ amount: '', tds: '', discount: '', narration: '', paymentAdvisory: null, date: new Date().toISOString().split('T')[0], mode: 'Bank' });
    alert(`✅ Receipt Created!\n\nReceipt No: ${receiptNo}\nAmount: ${formatCurrency(totalCredit)}`);
  };

  // ============================================
  // CREDIT NOTE HANDLING
  // ============================================
  
  const openCreditNoteModal = (row) => {
    setSelectedRow(row);
    setCreditNoteForm({
      amount: '',
      reason: '',
      date: new Date().toISOString().split('T')[0]
    });
    setShowCreditNoteModal(true);
  };

  const handleCreditNoteSubmit = () => {
    if (!selectedRow || !creditNoteForm.amount || !creditNoteForm.reason) {
      alert('Please enter credit note amount and reason');
      return;
    }
    
    const creditNoteNo = `CN/${new Date().getFullYear()}-${String(new Date().getFullYear() + 1).slice(-2)}/${nextCreditNoteNo}`;
    const creditAmount = parseFloat(creditNoteForm.amount) || 0;
    
    const newCreditNote = {
      id: Date.now(),
      creditNoteNo,
      invoiceNo: selectedRow.invoiceNo,
      partyName: selectedRow.partyName,
      date: creditNoteForm.date,
      amount: creditAmount,
      reason: creditNoteForm.reason
    };
    
    setCreditNotes(prev => [...prev, newCreditNote]);
    
    // Add to ledger
    setLedgerEntries(prev => [...prev, {
      id: Date.now(),
      partyName: selectedRow.partyName,
      date: creditNoteForm.date,
      particulars: `Credit Note ${creditNoteNo}`,
      narration: creditNoteForm.reason,
      debit: 0,
      credit: creditAmount,
      type: 'creditnote',
      creditNoteNo,
      invoiceNo: selectedRow.invoiceNo
    }]);
    
    setNextCreditNoteNo(prev => prev + 1);
    setShowCreditNoteModal(false);
    setSelectedRow(null);
    setCreditNoteForm({ amount: '', reason: '', date: new Date().toISOString().split('T')[0] });
    alert(`✅ Credit Note Created!\n\nCredit Note No: ${creditNoteNo}\nAmount: ${formatCurrency(creditAmount)}`);
  };

  const handlePaymentAdvisoryUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setReceiptForm(prev => ({ ...prev, paymentAdvisory: event.target.result }));
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // ============================================
  // DELETE INVOICE
  // ============================================
  
  const openDeleteConfirm = (row) => {
    setSelectedRow(row);
    setShowDeleteConfirmModal(true);
  };

  const handleDeleteInvoice = () => {
    if (!selectedRow) return;
    
    const invoiceNo = selectedRow.invoiceNo;
    
    if (selectedRow.invoiceType === 'Combined' && selectedRow.combinationCode !== 'NA') {
      // Reset all rows with this combination code
      setMasterData(prev => prev.map(r => {
        if (r.combinationCode === selectedRow.combinationCode) {
          return {
            ...r,
            invoiceNo: '',
            invoiceDate: '',
            invoiceTotalAmount: '',
            invoiceGenerated: false,
            invoiceStatus: 'Pending',
            invoiceType: 'Individual', // Reset to Individual for re-selection
            combinationCode: 'NA',
            mailingSent: 'No',
            editComments: ''
          };
        }
        return r;
      }));
    } else {
      // Reset single row
      setMasterData(prev => prev.map(r => {
        if (r.id === selectedRow.id) {
          return {
            ...r,
            invoiceNo: '',
            invoiceDate: '',
            invoiceTotalAmount: '',
            invoiceGenerated: false,
            invoiceStatus: 'Pending',
            invoiceType: 'Individual',
            combinationCode: 'NA',
            mailingSent: 'No',
            editComments: ''
          };
        }
        return r;
      }));
    }
    
    // Remove from ledger
    setLedgerEntries(prev => prev.filter(e => e.invoiceNo !== invoiceNo));
    
    setShowDeleteConfirmModal(false);
    setSelectedRow(null);
    alert(`✅ Invoice ${invoiceNo} deleted. You can now regenerate the invoice.`);
  };

  // ============================================
  // EXCEL HANDLING
  // ============================================
  
  const handleInvoiceValueUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const workbook = XLSX.read(event.target.result, { type: 'binary' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(sheet);
      const newValues = {};
      data.forEach(row => {
        const partyName = row['Party Name'] || row['PARTY NAME'] || row['PartyName'] || '';
        const amount = parseFloat(row['Amount'] || row['AMOUNT'] || row['Invoice Amount'] || 0);
        if (partyName && amount > 0) newValues[partyName.trim()] = amount;
      });
      setInvoiceValues(prev => ({ ...prev, ...newValues }));
      alert(`✅ Loaded ${Object.keys(newValues).length} party invoice values!`);
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  const downloadInvoiceValueTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([
      { 'Party Name': 'ABC Group Private Limited', 'Amount': 5500 },
      { 'Party Name': 'XYZ Media Pvt Ltd', 'Amount': 7500 }
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Invoice Values');
    XLSX.writeFile(wb, 'Invoice_Values_Template.xlsx');
  };

  const handleExcelUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const workbook = XLSX.read(event.target.result, { type: 'binary', cellDates: true });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(sheet, { raw: false });
      
      // Create a Set of existing campaign keys for duplicate checking
      const existingKeys = new Set(
        masterData.map(row => `${row.date}|${row.partyName}|${row.senderName}|${row.subject}`.toLowerCase())
      );
      
      let duplicateCount = 0;
      let addedCount = 0;
      
      const processedData = data.map((row, index) => {
        const campaignName = row['CAMPAIGN NAME'] || row['Campaign Name'] || '';
        const extractedEmail = extractEmail(campaignName);
        let dateValue = row['DATE'] || row['Date'] || new Date();
        if (typeof dateValue === 'string') dateValue = new Date(dateValue);
        const partyName = (row['PARTY NAME'] || row['Party Name'] || '').trim();
        const senderName = row['SENDER NAME'] || row['Sender Name'] || '';
        const subject = row['SUBJECT'] || row['Subject'] || '';
        const defaultAmount = invoiceValues[partyName] || '';
        const dateStr = dateValue instanceof Date && !isNaN(dateValue) ? dateValue.toISOString().split('T')[0] : '';
        
        // Create unique key for this campaign
        const campaignKey = `${dateStr}|${partyName}|${senderName}|${subject}`.toLowerCase();
        
        // Check if this campaign already exists
        if (existingKeys.has(campaignKey)) {
          duplicateCount++;
          return null; // Skip duplicate
        }
        
        // Add to existing keys to prevent duplicates within the same upload
        existingKeys.add(campaignKey);
        addedCount++;
        
        return {
          id: Date.now() + index + Math.random(),
          sno: row['SNO'] || row['SNO.'] || row['Sno'] || index + 1,
          date: dateStr,
          month: row['Month'] || row['MONTH'] || '',
          statePartyDetails: row['State/Party Details'] || row['STATE/PARTY DETAILS'] || '',
          partyName: partyName,
          senderName: senderName,
          campaignName: campaignName,
          subject: subject,
          emailId: extractedEmail,
          additionalEmails: [],
          toBeBilled: 'Not Yet',
          invoiceAmount: defaultAmount,
          cgst: '', sgst: '', igst: '', totalWithGst: '',
          invoiceType: 'Individual',
          combinationCode: 'NA',
          invoiceNo: '', invoiceDate: '', invoiceTotalAmount: '',
          invoiceGenerated: false,
          invoiceStatus: 'Pending',
          mailingSent: 'No',
          mailerUploaded: false,
          editComments: ''
        };
      }).filter(row => row !== null); // Remove null entries (duplicates)
      
      if (processedData.length > 0) {
        setMasterData(prev => [...prev, ...processedData]);
        const newParties = [...new Set(processedData.map(r => r.partyName))];
        setExpandedParties(prev => {
          const newSet = new Set(prev);
          newParties.forEach(p => newSet.add(p));
          return newSet;
        });
      }
      
      // Show summary message
      let message = `✅ Upload Complete!\n\n`;
      message += `• ${addedCount} new campaigns added\n`;
      if (duplicateCount > 0) {
        message += `• ${duplicateCount} duplicate entries skipped`;
      }
      alert(message);
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  // Clear Master Data Function (clears campaigns, invoices, receipts, ledger entries)
  const clearMasterData = async () => {
    setMasterData([]);
    setLedgerEntries([]);
    setReceipts([]);
    setCreditNotes([]);
    setMailerImages({});
    setOpeningBalances({});
    setNextInvoiceNo(1);
    setNextCombineNo(1);
    setNextReceiptNo(1);
    setNextCreditNoteNo(1);
    setSelectedParty(null);
    setExpandedParties(new Set());
    
    // Save to Firebase
    await saveDataToFirebase();
    
    setShowClearDataModal(false);
    alert('✅ All master data, invoices, receipts, and ledger entries have been cleared!');
  };

  // ============================================
  // BILLING & GST
  // ============================================
  
  const calculateGst = (row) => {
    const amount = parseFloat(row.invoiceAmount) || 0;
    const isSameState = row.statePartyDetails?.toUpperCase().includes('MAHARASHTRA');
    if (isSameState) {
      const cgst = amount * 0.09;
      const sgst = amount * 0.09;
      return { cgst, sgst, igst: 0, total: amount + cgst + sgst };
    } else {
      const igst = amount * 0.18;
      return { cgst: 0, sgst: 0, igst, total: amount + igst };
    }
  };

  const updateBillingStatus = (rowId, status) => {
    setMasterData(prev => prev.map(row => {
      if (row.id === rowId) {
        if (status === 'Yes' && row.invoiceAmount) {
          const gst = calculateGst(row);
          return { ...row, toBeBilled: status, cgst: gst.cgst.toFixed(2), sgst: gst.sgst.toFixed(2), igst: gst.igst.toFixed(2), totalWithGst: gst.total.toFixed(2) };
        }
        return { ...row, toBeBilled: status };
      }
      return row;
    }));
  };

  const updateRowField = (rowId, field, value) => {
    setMasterData(prev => prev.map(row => {
      if (row.id === rowId) {
        const updated = { ...row, [field]: value };
        if (field === 'invoiceAmount' && row.toBeBilled === 'Yes') {
          const gst = calculateGst(updated);
          return { ...updated, cgst: gst.cgst.toFixed(2), sgst: gst.sgst.toFixed(2), igst: gst.igst.toFixed(2), totalWithGst: gst.total.toFixed(2) };
        }
        return updated;
      }
      return row;
    }));
  };

  const updateMailingStatus = (rowId, status) => {
    const row = masterData.find(r => r.id === rowId);
    if (!row) return;
    if (row.combinationCode && row.combinationCode !== 'NA') {
      setMasterData(prev => prev.map(r => r.combinationCode === row.combinationCode ? { ...r, mailingSent: status } : r));
    } else {
      setMasterData(prev => prev.map(r => r.id === rowId ? { ...r, mailingSent: status } : r));
    }
  };

  // ============================================
  // INVOICE GENERATION
  // ============================================
  
  const generateIndividualInvoice = (row) => {
    const invoiceNo = `${companyConfig.invoicePrefix}${nextInvoiceNo}`;
    const invoiceDate = new Date().toISOString().split('T')[0];
    const totalAmount = parseFloat(row.totalWithGst) || (parseFloat(row.invoiceAmount) * 1.18);
    
    setMasterData(prev => prev.map(r => {
      if (r.id === row.id) {
        return { ...r, invoiceNo, invoiceDate, invoiceTotalAmount: totalAmount.toFixed(2), invoiceGenerated: true, invoiceStatus: 'Created', invoiceType: 'Individual', combinationCode: 'NA' };
      }
      return r;
    }));
    
    setLedgerEntries(prev => [...prev, { id: Date.now(), partyName: row.partyName, date: invoiceDate, particulars: `Invoice ${invoiceNo} - ${row.senderName}`, debit: totalAmount, credit: 0, type: 'invoice', invoiceNo }]);
    setNextInvoiceNo(prev => prev + 1);
    alert(`✅ Invoice Generated!\n\nInvoice No: ${invoiceNo}\nAmount: ${formatCurrency(totalAmount)}\n\nPlease review and Approve or mark as Need Edits.`);
  };

  const generateCombinedInvoice = () => {
    if (selectedForCombine.size < 2) {
      alert('Please select at least 2 campaigns to combine');
      return;
    }

    const invoiceNo = `${companyConfig.invoicePrefix}${nextInvoiceNo}`;
    const invoiceDate = new Date().toISOString().split('T')[0];
    const combinationCode = String(nextCombineNo);
    
    let totalAmount = 0;
    const selectedRows = masterData.filter(r => selectedForCombine.has(r.id));
    selectedRows.forEach(r => {
      totalAmount += parseFloat(r.totalWithGst) || (parseFloat(r.invoiceAmount) * 1.18);
    });

    setMasterData(prev => prev.map(r => {
      if (selectedForCombine.has(r.id)) {
        return { ...r, invoiceNo, invoiceDate, invoiceTotalAmount: totalAmount.toFixed(2), invoiceGenerated: true, invoiceStatus: 'Created', invoiceType: 'Combined', combinationCode, mailingSent: 'No' };
      }
      return r;
    }));

    const campaignNames = selectedRows.map(r => r.senderName).join(', ');
    setLedgerEntries(prev => [...prev, { id: Date.now(), partyName: combineParty, date: invoiceDate, particulars: `Combined Invoice ${invoiceNo} - ${campaignNames}`, debit: totalAmount, credit: 0, type: 'invoice', invoiceNo, combinationCode }]);

    setNextInvoiceNo(prev => prev + 1);
    setNextCombineNo(prev => prev + 1);
    setShowCombineModal(false);
    setSelectedForCombine(new Set());
    setCombineParty(null);
    alert(`✅ Combined Invoice Generated!\n\nInvoice No: ${invoiceNo}\nCampaigns: ${selectedForCombine.size}\nTotal: ${formatCurrency(totalAmount)}\n\nPlease review and Approve or mark as Need Edits.`);
  };

  const toggleCombineSelection = (rowId) => {
    setSelectedForCombine(prev => {
      const newSet = new Set(prev);
      if (newSet.has(rowId)) newSet.delete(rowId);
      else newSet.add(rowId);
      return newSet;
    });
  };

  const openCombineModal = (row) => {
    setCombineParty(row.partyName);
    setSelectedForCombine(new Set([row.id]));
    setShowCombineModal(true);
  };

  // ============================================
  // IMAGE HANDLING
  // ============================================
  
  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file || !selectedRow) return;
    const reader = new FileReader();
    reader.onload = (event) => saveMailerImage(event.target.result);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const saveMailerImage = (imageData) => {
    if (!selectedRow) return;
    const key = selectedRow.id;
    if (replaceMode) {
      setMailerImages(prev => ({ ...prev, [key]: [imageData] }));
    } else {
      setMailerImages(prev => ({ ...prev, [key]: [...(prev[key] || []), imageData] }));
    }
    setMasterData(prev => prev.map(r => r.id === selectedRow.id ? { ...r, mailerUploaded: true } : r));
    setPastedImage(null);
    setReplaceMode(false);
    setShowUploadModal(false);
    alert('✅ Mailer image saved!');
  };

  const handlePaste = (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const blob = items[i].getAsFile();
        const reader = new FileReader();
        reader.onload = (event) => setPastedImage(event.target.result);
        reader.readAsDataURL(blob);
        e.preventDefault();
        break;
      }
    }
  };

  const openGmailSearch = (subject) => {
    const searchQuery = encodeURIComponent(subject || 'campaign');
    window.open(`https://mail.google.com/mail/u/0/#search/${searchQuery}`, '_blank');
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => setMailerLogo(event.target.result);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // ============================================
  // EMAIL GENERATION - UPDATED FOR COMBINED
  // ============================================
  
  const generateEmailSubject = (row) => {
    const campaigns = getCombinedCampaigns(row);
    if (campaigns.length > 1) {
      const names = campaigns.map(c => c.senderName).join(', ');
      return `Invoice ${row.invoiceNo || ''} - ${names}`;
    }
    return `Invoice ${row.invoiceNo || ''} - ${row.senderName} - ${row.subject}`;
  };

  const generateEmailBody = (row) => {
    const campaigns = getCombinedCampaigns(row);
    const amount = parseFloat(row.invoiceTotalAmount) || parseFloat(row.totalWithGst) || (parseFloat(row.invoiceAmount) * 1.18);
    
    let campaignDetails = '';
    if (campaigns.length > 1) {
      campaignDetails = 'Campaigns included in this invoice:\n';
      campaigns.forEach((c, i) => {
        campaignDetails += `${i + 1}. ${c.senderName} - ${c.subject}\n`;
      });
    } else {
      campaignDetails = `Campaign: ${row.senderName}\nSubject: ${row.subject}`;
    }
    
    return `Dear Sir/Madam,

Please find attached the invoice for the following:

${campaignDetails}

Invoice No: ${row.invoiceNo || 'To be generated'}
Invoice Amount: ${formatCurrency(amount)}

Kindly process the payment at your earliest convenience.

Bank Details:
Bank: ${companyConfig.bank.name}
A/C No: ${companyConfig.bank.account}
IFSC: ${companyConfig.bank.ifsc}
Branch: ${companyConfig.bank.branch}

Thank you for your business.

Best Regards,
${companyConfig.name}
${companyConfig.email}`;
  };

  // ============================================
  // PDF GENERATION - RELIABLE DOWNLOAD
  // ============================================
  
  const [showInvoiceViewer, setShowInvoiceViewer] = useState(false);
  const [currentInvoiceHtml, setCurrentInvoiceHtml] = useState('');
  
  const generateInvoiceHtml = (row) => {
    let campaigns = [row];
    let totalAmount = parseFloat(row.invoiceAmount) || 0;
    
    if (row.invoiceType === 'Combined' && row.combinationCode !== 'NA') {
      campaigns = masterData.filter(r => r.combinationCode === row.combinationCode);
      totalAmount = campaigns.reduce((sum, c) => sum + (parseFloat(c.invoiceAmount) || 0), 0);
    }
    
    const isSameState = row.statePartyDetails?.toUpperCase().includes('MAHARASHTRA');
    const cgst = isSameState ? totalAmount * 0.09 : 0;
    const sgst = isSameState ? totalAmount * 0.09 : 0;
    const igst = isSameState ? 0 : totalAmount * 0.18;
    const totalTax = cgst + sgst + igst;
    const grandTotal = totalAmount + totalTax;
    
    const lineItemsHtml = campaigns.map((c, i) => `
      <tr>
        <td style="border: 1px solid #000; padding: 8px; text-align: center; font-size: 12px;">${i + 1}</td>
        <td style="border: 1px solid #000; padding: 8px; font-size: 12px;">
          <div style="font-weight: 600;">PROMOTIONAL TRADE EMAILER</div>
          <div style="font-style: italic; color: #555; font-size: 11px; margin-top: 2px;">${c.senderName || ''} - ${formatDate(c.date)}</div>
          <div style="font-style: italic; color: #555; font-size: 11px;">Subject: ${c.subject || ''}</div>
        </td>
        <td style="border: 1px solid #000; padding: 8px; text-align: center; font-size: 12px;">${companyConfig.hsnCode}</td>
        <td style="border: 1px solid #000; padding: 8px; text-align: right; font-size: 12px;">${formatCurrencyShort(parseFloat(c.invoiceAmount) || 0)}</td>
      </tr>
    `).join('');
    
    let allMailerImages = [];
    if (row.invoiceType === 'Combined' && row.combinationCode !== 'NA') {
      campaigns.forEach(c => {
        const imgs = mailerImages[c.id] || [];
        imgs.forEach(img => allMailerImages.push({ img, campaign: c }));
      });
    } else {
      const imgs = mailerImages[row.id] || [];
      imgs.forEach(img => allMailerImages.push({ img, campaign: row }));
    }
    
    const mailerPagesHtml = allMailerImages.map(({ img, campaign }) => `
      <div class="page-break-before" style="page-break-before: always; padding: 40px; text-align: center; background: white;">
        ${mailerLogo ? `<div style="margin-bottom: 20px;"><img src="${mailerLogo}" alt="Logo" style="max-height: 70px;" /></div>` : `
          <div style="display: flex; align-items: center; justify-content: center; gap: 15px; margin-bottom: 25px;">
            <div style="width: 55px; height: 55px; border-radius: 50%; background: #2874A6; color: white; font-size: 24px; font-weight: bold; font-style: italic; display: flex; align-items: center; justify-content: center;">im</div>
            <span style="font-size: 22px; font-weight: bold; color: #2874A6;">INDREESH MEDIA LLP</span>
          </div>
        `}
        <h2 style="font-size: 20px; text-decoration: underline; margin: 25px 0;">MAILER SUPPORTING</h2>
        <p style="font-size: 15px; margin: 12px 0; text-align: left;"><strong>MAILER DATE:</strong> ${formatDateOrdinal(campaign.date)}</p>
        <p style="font-size: 15px; margin: 12px 0; text-align: left;"><strong>CAMPAIGN:</strong> ${campaign.senderName}</p>
        <p style="font-size: 15px; margin: 12px 0; text-align: left;"><strong>SUBJECT:</strong> ${campaign.subject || 'Campaign'}</p>
        <div style="margin-top: 25px;"><img src="${img}" alt="Mailer" style="max-width: 100%; max-height: 550px; border: 1px solid #ddd;" /></div>
      </div>
    `).join('');
    
    return `
  <div style="max-width: 900px; margin: 0 auto; padding: 15px; background: white; font-family: Arial, sans-serif; font-size: 12px; line-height: 1.4;">
    <style>
      @media print {
        @page { size: A4; margin: 8mm; }
        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .page-break-before { page-break-before: always; }
      }
    </style>
    <div style="border: 2px solid #000; background: white;">
      <div style="text-align: center; padding: 12px; font-size: 18px; font-weight: bold; border-bottom: 2px solid #000; background: #f8f8f8;">Tax Invoice ${row.invoiceType === 'Combined' ? '<span style="display: inline-block; background: #7C3AED; color: white; padding: 3px 10px; border-radius: 5px; font-size: 11px; margin-left: 10px;">COMBINED</span>' : ''}</div>
      <div style="text-align: center; font-size: 11px; font-style: italic; padding: 5px; border-bottom: 1px solid #000; background: #fafafa;">(Original for Recipient)</div>
      <div style="display: flex; border-bottom: 2px solid #000;">
        <div style="flex: 1.5; padding: 12px; border-right: 2px solid #000;">
          <div style="font-size: 16px; font-weight: bold; margin-bottom: 8px; color: #1a5276;">${companyConfig.name}</div>
          <div style="font-size: 11px; line-height: 1.5; color: #333;">${companyConfig.address}<br>${companyConfig.addressLine2}<br>${companyConfig.city}<br><strong>GSTIN/UIN:</strong> ${companyConfig.gstin}<br><strong>State:</strong> ${companyConfig.stateName}, Code: ${companyConfig.stateCode}<br><strong>Contact:</strong> ${companyConfig.phone}<br><strong>E-Mail:</strong> ${companyConfig.email}</div>
        </div>
        <div style="flex: 1; font-size: 12px;">
          <div style="display: flex; border-bottom: 1px solid #000;"><div style="flex: 1; padding: 8px; border-right: 1px solid #000; font-weight: bold; background: #f5f5f5;">Invoice No.</div><div style="flex: 1; padding: 8px; font-weight: 600; color: #1a5276;">${row.invoiceNo || ''}</div></div>
          <div style="display: flex; border-bottom: 1px solid #000;"><div style="flex: 1; padding: 8px; border-right: 1px solid #000; font-weight: bold; background: #f5f5f5;">Dated</div><div style="flex: 1; padding: 8px;">${formatDate(row.invoiceDate || row.date)}</div></div>
          ${row.invoiceType === 'Combined' ? '<div style="display: flex;"><div style="flex: 1; padding: 8px; border-right: 1px solid #000; font-weight: bold; background: #f5f5f5;">Combine Code</div><div style="flex: 1; padding: 8px; color: #7C3AED; font-weight: bold;">C' + row.combinationCode + '</div></div>' : ''}
        </div>
      </div>
      <div style="padding: 10px 12px; border-bottom: 2px solid #000; background: #fafafa;">
        <div style="font-size: 11px; color: #666; margin-bottom: 3px;">Buyer (Bill to)</div>
        <div style="font-size: 14px; font-weight: bold; margin-bottom: 4px; color: #1a5276;">${row.partyName}</div>
        <div style="font-size: 11px; color: #333;">${row.statePartyDetails || ''}<br>Place of Supply: ${row.statePartyDetails || companyConfig.stateName}</div>
      </div>
      <table style="width: 100%; border-collapse: collapse;">
        <thead><tr style="background: #e8e8e8;"><th style="border: 1px solid #000; padding: 10px; width: 45px; font-size: 12px;">Sl No.</th><th style="border: 1px solid #000; padding: 10px; font-size: 12px;">Particulars</th><th style="border: 1px solid #000; padding: 10px; width: 80px; font-size: 12px;">HSN/SAC</th><th style="border: 1px solid #000; padding: 10px; width: 100px; text-align: right; font-size: 12px;">Amount</th></tr></thead>
        <tbody>
          ${lineItemsHtml}
          ${campaigns.length > 1 ? '<tr style="background: #f5f5f5;"><td colspan="3" style="border: 1px solid #000; padding: 10px; text-align: right; font-weight: bold; font-size: 13px;">Sub Total</td><td style="border: 1px solid #000; padding: 10px; text-align: right; font-weight: bold; font-size: 13px;">' + formatCurrencyShort(totalAmount) + '</td></tr>' : ''}
          ${isSameState ? `<tr><td colspan="3" style="border: 1px solid #000; padding: 8px; text-align: right; font-weight: 600; font-size: 12px;">CGST @ 9%</td><td style="border: 1px solid #000; padding: 8px; text-align: right; font-size: 12px;">${formatCurrencyShort(cgst)}</td></tr><tr><td colspan="3" style="border: 1px solid #000; padding: 8px; text-align: right; font-weight: 600; font-size: 12px;">SGST @ 9%</td><td style="border: 1px solid #000; padding: 8px; text-align: right; font-size: 12px;">${formatCurrencyShort(sgst)}</td></tr>` : `<tr><td colspan="3" style="border: 1px solid #000; padding: 8px; text-align: right; font-weight: 600; font-size: 12px;">IGST @ 18%</td><td style="border: 1px solid #000; padding: 8px; text-align: right; font-size: 12px;">${formatCurrencyShort(igst)}</td></tr>`}
          <tr style="background: #2874A6; color: white;"><td colspan="3" style="border: 1px solid #000; padding: 12px; text-align: right; font-weight: bold; font-size: 14px;">Total</td><td style="border: 1px solid #000; padding: 12px; text-align: right; font-weight: bold; font-size: 14px;">₹ ${grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td></tr>
        </tbody>
      </table>
      <div style="padding: 10px 12px; border: 1px solid #000; border-top: none; background: #fafafa;"><div style="color: #666; font-size: 11px; margin-bottom: 3px;">Amount Chargeable (in words)</div><div style="font-weight: bold; font-size: 13px;">${numberToWords(grandTotal)}</div></div>
      <div style="display: flex; border-top: 2px solid #000;">
        <div style="flex: 1; padding: 10px 12px; border-right: 2px solid #000; font-size: 11px;"><div><strong>Company's PAN:</strong> ${companyConfig.pan}</div></div>
        <div style="flex: 1.2; padding: 10px 12px; font-size: 11px;">
          <div style="font-weight: bold; margin-bottom: 6px; color: #1a5276;">Company's Bank Details</div>
          <div style="line-height: 1.5;"><strong>A/c Holder:</strong> ${companyConfig.bank.holder}<br><strong>Bank:</strong> ${companyConfig.bank.name}<br><strong>A/c No.:</strong> ${companyConfig.bank.account}<br><strong>IFSC:</strong> ${companyConfig.bank.ifsc}</div>
          <div style="text-align: right; margin-top: 30px;"><div style="font-weight: bold;">for ${companyConfig.name}</div><div style="margin-top: 25px; border-top: 1px solid #000; display: inline-block; padding-top: 4px; font-size: 10px;">Authorised Signatory</div></div>
        </div>
      </div>
      <div style="text-align: center; padding: 8px; background: #f0f0f0; border-top: 1px solid #000; font-size: 10px; color: #666; font-style: italic;">This is a Computer Generated Invoice</div>
    </div>
  </div>
  ${mailerPagesHtml}
`;
  };
  
  // View invoice in modal
  const viewInvoice = (row) => {
    const html = generateInvoiceHtml(row);
    setCurrentInvoiceHtml(html);
    setSelectedRow(row);
    setShowInvoiceViewer(true);
  };
  
  // Download invoice as HTML file (reliable method)
  const downloadInvoiceFile = (row) => {
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Invoice ${row.invoiceNo || ''}</title>
  <style>
    @page { size: A4; margin: 10mm; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
    body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
  </style>
</head>
<body>
${generateInvoiceHtml(row)}
<script>
  // Auto-open print dialog when file is opened
  window.onload = function() { 
    setTimeout(function() { window.print(); }, 500); 
  };
</script>
</body>
</html>`;
    
    // Create download link
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Invoice_${(row.invoiceNo || 'draft').replace(/\//g, '-')}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  // Main download/view invoice function - opens modal
  const downloadInvoice = (row) => {
    viewInvoice(row);
  };
  
  // ============================================
  // PAYMENT
  // ============================================
  
  const handleRecordPayment = (row) => {
    setSelectedRow(row);
    let totalAmount = parseFloat(row.invoiceTotalAmount) || parseFloat(row.totalWithGst) || (parseFloat(row.invoiceAmount) * 1.18);
    setPaymentForm({ amount: totalAmount.toFixed(2), date: new Date().toISOString().split('T')[0], mode: 'Bank', tds: '', discount: '', narration: '' });
    setShowPaymentModal(true);
  };

  const confirmPayment = () => {
    const amount = parseFloat(paymentForm.amount) || 0;
    const tds = parseFloat(paymentForm.tds) || 0;
    const discount = parseFloat(paymentForm.discount) || 0;
    const totalSettled = amount + tds + discount;
    let expectedAmount = parseFloat(selectedRow.invoiceTotalAmount) || parseFloat(selectedRow.totalWithGst) || (parseFloat(selectedRow.invoiceAmount) * 1.18);
    const newStatus = totalSettled >= expectedAmount ? 'Paid' : 'Partially Paid';
    
    if (selectedRow.invoiceType === 'Combined' && selectedRow.combinationCode !== 'NA') {
      setMasterData(prev => prev.map(r => r.combinationCode === selectedRow.combinationCode ? { ...r, invoiceStatus: newStatus } : r));
    } else {
      setMasterData(prev => prev.map(r => r.id === selectedRow.id ? { ...r, invoiceStatus: newStatus } : r));
    }
    
    const newEntries = [];
    if (amount > 0) newEntries.push({ id: Date.now(), partyName: selectedRow.partyName, date: paymentForm.date, particulars: paymentForm.narration ? `Payment Received - ${paymentForm.mode} (${paymentForm.narration})` : `Payment Received - ${paymentForm.mode}`, debit: 0, credit: amount, type: 'payment' });
    if (tds > 0) newEntries.push({ id: Date.now() + 1, partyName: selectedRow.partyName, date: paymentForm.date, particulars: `TDS Deducted - Inv: ${selectedRow.invoiceNo}`, debit: 0, credit: tds, type: 'tds' });
    if (discount > 0) newEntries.push({ id: Date.now() + 2, partyName: selectedRow.partyName, date: paymentForm.date, particulars: `Discount Allowed - Inv: ${selectedRow.invoiceNo}`, debit: 0, credit: discount, type: 'discount' });
    
    setLedgerEntries(prev => [...prev, ...newEntries]);
    setShowPaymentModal(false);
    setSelectedRow(null);
  };

  const togglePartyExpansion = (party) => {
    setExpandedParties(prev => {
      const newSet = new Set(prev);
      if (newSet.has(party)) newSet.delete(party);
      else newSet.add(party);
      return newSet;
    });
  };

  // ============================================
  // RENDER SIDEBAR
  // ============================================
  
  const renderSidebar = () => {
    // Menu items based on role
    const financeMenuItems = [
      { id: 'master', icon: Table, label: 'Master Sheet' },
      { id: 'invoices', icon: FileText, label: 'Invoice Register' },
      { id: 'ledgers', icon: BookOpen, label: 'Party Ledgers' },
      { id: 'reports', icon: BarChart3, label: 'Reports' },
      { id: 'settings', icon: Settings, label: 'Settings' }
    ];
    
    const directorMenuItems = [
      { id: 'master', icon: Table, label: 'Master Sheet' },
      { id: 'invoices', icon: FileText, label: 'Invoice Register' },
      { id: 'ledgers', icon: BookOpen, label: 'Party Ledgers' },
      { id: 'reports', icon: BarChart3, label: 'Reports' }
    ];
    
    const menuItems = userRole === 'director' ? directorMenuItems : financeMenuItems;

    return (
      <div style={{ width: sidebarCollapsed ? '60px' : '200px', backgroundColor: '#1E293B', color: '#FFFFFF', display: 'flex', flexDirection: 'column', transition: 'width 0.2s ease', flexShrink: 0 }}>
        <div style={{ padding: sidebarCollapsed ? '12px' : '16px', borderBottom: '1px solid #334155', display: 'flex', alignItems: 'center', justifyContent: sidebarCollapsed ? 'center' : 'space-between' }}>
          {!sidebarCollapsed && <div><div style={{ fontSize: '15px', fontWeight: '700' }}>INDREESH MEDIA</div><div style={{ fontSize: '10px', color: '#94A3B8' }}>{userRole === 'director' ? 'Director View' : 'Finance Team'}</div></div>}
          <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '4px' }}>
            {sidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>
        {/* Save Status */}
        {!sidebarCollapsed && (
          <div style={{ padding: '8px 16px', borderBottom: '1px solid #334155', fontSize: '11px' }}>
            {isSaving ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#FCD34D' }}>
                <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />
                <span>Saving...</span>
              </div>
            ) : lastSaved ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#86EFAC' }}>
                <Check size={12} />
                <span>Saved {lastSaved.toLocaleTimeString()}</span>
              </div>
            ) : (
              <div style={{ color: '#94A3B8' }}>Cloud Sync Active</div>
            )}
          </div>
        )}
        <nav style={{ flex: 1, padding: '8px' }}>
          {menuItems.map(item => (
            <button key={item.id} onClick={() => setActiveMenu(item.id)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: sidebarCollapsed ? '12px' : '11px 14px', marginBottom: '4px', borderRadius: '8px', border: 'none', backgroundColor: activeMenu === item.id ? '#2874A6' : 'transparent', color: activeMenu === item.id ? '#FFFFFF' : '#94A3B8', cursor: 'pointer', fontSize: '14px', fontWeight: activeMenu === item.id ? '600' : '500', justifyContent: sidebarCollapsed ? 'center' : 'flex-start' }} title={item.label}>
              <item.icon size={18} />
              {!sidebarCollapsed && <span>{item.label}</span>}
            </button>
          ))}
        </nav>
        {/* Logout button */}
        <div style={{ padding: '8px', borderTop: '1px solid #334155' }}>
          <button onClick={handleLogout} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: sidebarCollapsed ? '12px' : '11px 14px', borderRadius: '8px', border: 'none', backgroundColor: '#DC2626', color: '#FFFFFF', cursor: 'pointer', fontSize: '14px', fontWeight: '600', justifyContent: sidebarCollapsed ? 'center' : 'flex-start' }} title="Logout">
            <X size={18} />
            {!sidebarCollapsed && <span>Logout</span>}
          </button>
        </div>
      </div>
    );
  };

  // ============================================
  // RENDER FILTERS
  // ============================================
  
  const renderFilters = () => (
    <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', border: '1px solid #E2E8F0', padding: '14px 18px', marginBottom: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Filter size={18} color="#64748B" />
          <span style={{ fontSize: '13px', fontWeight: '700', color: '#475569' }}>Filters:</span>
        </div>
        
        <div style={{ position: 'relative' }}>
          <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
          <input type="text" placeholder="Search..." value={filters.searchText} onChange={(e) => setFilters(prev => ({ ...prev, searchText: e.target.value }))}
            style={{ padding: '8px 12px 8px 32px', fontSize: '13px', border: '1.5px solid #E2E8F0', borderRadius: '8px', width: '160px' }} />
        </div>
        
        <select value={filters.party} onChange={(e) => setFilters(prev => ({ ...prev, party: e.target.value }))} style={{ padding: '8px 12px', fontSize: '13px', border: '1.5px solid #E2E8F0', borderRadius: '8px', backgroundColor: filters.party ? '#EFF6FF' : '#FFFFFF' }}>
          <option value="">All Parties</option>
          {parties.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        
        <select value={filters.billStatus} onChange={(e) => setFilters(prev => ({ ...prev, billStatus: e.target.value }))} style={{ padding: '8px 12px', fontSize: '13px', border: '1.5px solid #E2E8F0', borderRadius: '8px', backgroundColor: filters.billStatus ? '#EFF6FF' : '#FFFFFF' }}>
          <option value="">Bill Status</option>
          <option value="Yes">Yes</option>
          <option value="Not Yet">Not Yet</option>
        </select>
        
        <select value={filters.invoiceStatus} onChange={(e) => setFilters(prev => ({ ...prev, invoiceStatus: e.target.value }))} style={{ padding: '8px 12px', fontSize: '13px', border: '1.5px solid #E2E8F0', borderRadius: '8px', backgroundColor: filters.invoiceStatus ? '#EFF6FF' : '#FFFFFF' }}>
          <option value="">Invoice Status</option>
          <option value="Generated">Generated</option>
          <option value="Not Generated">Not Generated</option>
          <option value="Paid">Paid</option>
        </select>
        
        {hasActiveFilters && (
          <>
            <button onClick={clearFilters} style={{ padding: '8px 12px', fontSize: '13px', fontWeight: '600', border: '1.5px solid #FCA5A5', borderRadius: '8px', backgroundColor: '#FEE2E2', color: '#991B1B', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <X size={14} /> Clear
            </button>
            <span style={{ fontSize: '13px', color: '#64748B' }}>Showing {filteredData.length} of {masterData.length}</span>
          </>
        )}
      </div>
    </div>
  );

  // ============================================
  // RENDER MASTER SHEET
  // ============================================
  
  const renderMasterSheet = () => {
    const partyNames = Object.keys(groupedData).sort();

    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '700', color: '#1E293B' }}>📊 Master Sheet</h1>
            <p style={{ margin: '4px 0 0', fontSize: '14px', color: '#64748B' }}>{masterData.length} campaigns • {parties.length} parties • {masterData.filter(r => r.invoiceGenerated).length} invoiced</p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input type="file" ref={excelInputRef} accept=".xlsx,.xls,.csv" style={{ display: 'none' }} onChange={handleExcelUpload} />
            <ActionButton icon={Upload} label="Upload Data" variant="brand" onClick={() => excelInputRef.current?.click()} />
            {canEdit && masterData.length > 0 && (
              <ActionButton icon={Trash2} label="Clear All Data" variant="danger" onClick={() => setShowClearDataModal(true)} />
            )}
          </div>
        </div>

        {masterData.length > 0 && renderFilters()}

        {partyNames.length === 0 ? (
          <Card>
            <div style={{ padding: '60px', textAlign: 'center', color: '#94A3B8' }}>
              <Upload size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
              <div style={{ fontSize: '18px', fontWeight: '600' }}>{hasActiveFilters ? 'No matching records' : 'No Data Yet'}</div>
              <div style={{ fontSize: '14px', marginTop: '4px' }}>{hasActiveFilters ? 'Try adjusting your filters' : 'Upload an Excel file to get started'}</div>
            </div>
          </Card>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {partyNames.map(party => {
              const rows = groupedData[party];
              const isExpanded = expandedParties.has(party);
              const billedCount = rows.filter(r => r.toBeBilled === 'Yes').length;
              const invoicedCount = rows.filter(r => r.invoiceGenerated).length;
              const partyTotal = rows.filter(r => r.toBeBilled === 'Yes').reduce((sum, r) => sum + (parseFloat(r.totalWithGst) || 0), 0);

              return (
                <div key={party} style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                  <div onClick={() => togglePartyExpansion(party)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', backgroundColor: '#F8FAFC', cursor: 'pointer', borderBottom: isExpanded ? '3px solid #2874A6' : 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {isExpanded ? <ChevronDown size={22} color="#2874A6" /> : <ChevronRight size={22} color="#64748B" />}
                      <div>
                        <div style={{ fontWeight: '700', fontSize: '16px', color: '#1E293B' }}>{party}</div>
                        <div style={{ fontSize: '13px', color: '#64748B', marginTop: '3px' }}>{rows.length} campaigns • {billedCount} to bill • {invoicedCount} invoiced</div>
                      </div>
                    </div>
                    {partyTotal > 0 && (
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '11px', color: '#64748B', textTransform: 'uppercase' }}>Total</div>
                        <div style={{ fontSize: '18px', fontWeight: '700', color: '#059669' }}>{formatCurrency(partyTotal)}</div>
                      </div>
                    )}
                  </div>

                  {isExpanded && (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', minWidth: '1800px' }}>
                        <thead>
                          <tr style={{ backgroundColor: '#F1F5F9' }}>
                            <th style={{ padding: '12px 14px', textAlign: 'left', fontWeight: '700', color: '#475569', borderBottom: '2px solid #E2E8F0', width: '90px' }}>Date</th>
                            <th style={{ padding: '12px 14px', textAlign: 'left', fontWeight: '700', color: '#475569', borderBottom: '2px solid #E2E8F0', width: '100px' }}>Sender</th>
                            <th style={{ padding: '12px 14px', textAlign: 'left', fontWeight: '700', color: '#475569', borderBottom: '2px solid #E2E8F0', minWidth: '180px' }}>Campaign / Subject</th>
                            <th style={{ padding: '12px 14px', textAlign: 'left', fontWeight: '700', color: '#475569', borderBottom: '2px solid #E2E8F0', width: '160px' }}>Email ID</th>
                            <th style={{ padding: '12px 14px', textAlign: 'center', fontWeight: '700', color: '#475569', borderBottom: '2px solid #E2E8F0', width: '70px' }}>Mailer</th>
                            <th style={{ padding: '12px 14px', textAlign: 'center', fontWeight: '700', color: '#475569', borderBottom: '2px solid #E2E8F0', width: '80px' }}>Bill?</th>
                            <th style={{ padding: '12px 14px', textAlign: 'right', fontWeight: '700', color: '#475569', borderBottom: '2px solid #E2E8F0', width: '90px' }}>Amount</th>
                            <th style={{ padding: '12px 14px', textAlign: 'center', fontWeight: '700', color: '#475569', borderBottom: '2px solid #E2E8F0', width: '90px' }}>Type</th>
                            <th style={{ padding: '12px 14px', textAlign: 'center', fontWeight: '700', color: '#475569', borderBottom: '2px solid #E2E8F0', width: '90px' }}>Generate</th>
                            <th style={{ padding: '12px 14px', textAlign: 'left', fontWeight: '700', color: '#1E40AF', borderBottom: '2px solid #E2E8F0', backgroundColor: '#EFF6FF', width: '110px' }}>Invoice No.</th>
                            <th style={{ padding: '12px 14px', textAlign: 'left', fontWeight: '700', color: '#1E40AF', borderBottom: '2px solid #E2E8F0', backgroundColor: '#EFF6FF', width: '90px' }}>Inv Date</th>
                            <th style={{ padding: '12px 14px', textAlign: 'right', fontWeight: '700', color: '#1E40AF', borderBottom: '2px solid #E2E8F0', backgroundColor: '#EFF6FF', width: '100px' }}>Inv Amount</th>
                            <th style={{ padding: '12px 14px', textAlign: 'center', fontWeight: '700', color: '#7C3AED', borderBottom: '2px solid #E2E8F0', backgroundColor: '#FAF5FF', width: '50px' }}>C#</th>
                            <th style={{ padding: '12px 14px', textAlign: 'center', fontWeight: '700', color: '#475569', borderBottom: '2px solid #E2E8F0', width: '120px' }}>Status/Approve</th>
                            <th style={{ padding: '12px 14px', textAlign: 'center', fontWeight: '700', color: '#475569', borderBottom: '2px solid #E2E8F0', width: '120px' }}>Actions</th>
                            <th style={{ padding: '12px 14px', textAlign: 'center', fontWeight: '700', color: '#059669', borderBottom: '2px solid #E2E8F0', backgroundColor: '#F0FDF4', width: '80px' }}>Mailed?</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((row) => {
                            const mailDisabled = row.invoiceType === 'Combined' && isCombinedMailSent(row.combinationCode) && row.mailingSent !== 'Yes';
                            const allEmails = getAllEmails(row);
                            const hasMailer = mailerImages[row.id] && mailerImages[row.id].length > 0;

                            return (
                              <tr key={row.id} style={{ backgroundColor: row.toBeBilled === 'Yes' ? (row.invoiceGenerated ? '#F0FDF4' : '#FFFBEB') : '#FFFFFF', borderBottom: '1px solid #F1F5F9' }}>
                                <td style={{ padding: '12px 14px', whiteSpace: 'nowrap', fontSize: '13px' }}>{formatDate(row.date)}</td>
                                <td style={{ padding: '12px 14px', fontWeight: '600', fontSize: '13px' }}>{row.senderName}</td>
                                <td style={{ padding: '12px 14px' }}>
                                  <div style={{ fontWeight: '600', fontSize: '13px', lineHeight: '1.4', color: '#1E293B' }}>{row.campaignName?.split('--')[0]?.trim() || row.senderName}</div>
                                  {row.subject && <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px', lineHeight: '1.3' }}>{row.subject}</div>}
                                </td>
                                
                                <td style={{ padding: '10px 14px' }}>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    {row.emailId && <div style={{ fontSize: '11px', color: '#1E40AF', backgroundColor: '#EFF6FF', padding: '2px 6px', borderRadius: '4px', display: 'inline-block' }}>{row.emailId}</div>}
                                    {(row.additionalEmails || []).map((email, i) => (
                                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <span style={{ fontSize: '11px', color: '#059669', backgroundColor: '#F0FDF4', padding: '2px 6px', borderRadius: '4px' }}>{email}</span>
                                        <button onClick={() => removeEmailFromRow(row.id, email)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: '#DC2626' }} title="Remove"><X size={12} /></button>
                                      </div>
                                    ))}
                                    <button onClick={() => { setSelectedRow(row); setNewEmailInput(''); setShowAddEmailModal(true); }} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#2874A6', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 0' }}><PlusCircle size={12} /> Add</button>
                                  </div>
                                </td>
                                
                                <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                                  {hasMailer ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                                      <span style={{ color: '#22C55E', fontWeight: '700', fontSize: '14px' }}>✓</span>
                                      <button onClick={() => { setSelectedRow(row); setPastedImage(null); setReplaceMode(true); setShowUploadModal(true); }} style={{ fontSize: '10px', color: '#64748B', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Replace</button>
                                    </div>
                                  ) : (
                                    <ActionButton icon={Camera} small variant="default" onClick={() => { setSelectedRow(row); setPastedImage(null); setReplaceMode(false); setShowUploadModal(true); }} />
                                  )}
                                </td>
                                
                                <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                                  <select value={row.toBeBilled} onChange={(e) => updateBillingStatus(row.id, e.target.value)} disabled={row.invoiceGenerated || !isDirector}
                                    style={{ padding: '6px 8px', fontSize: '12px', fontWeight: '600', border: '2px solid', borderRadius: '6px', borderColor: row.toBeBilled === 'Yes' ? '#22C55E' : '#E2E8F0', backgroundColor: row.toBeBilled === 'Yes' ? '#DCFCE7' : '#FFFFFF', color: row.toBeBilled === 'Yes' ? '#166534' : '#64748B', cursor: (row.invoiceGenerated || !isDirector) ? 'not-allowed' : 'pointer', width: '70px', opacity: (!isDirector && !row.invoiceGenerated) ? 0.6 : 1 }}>
                                    <option value="Not Yet">Not Yet</option>
                                    <option value="Yes">Yes</option>
                                  </select>
                                </td>
                                
                                <td style={{ padding: '10px 14px' }}>
                                  <input type="number" value={row.invoiceAmount || ''} onChange={(e) => updateRowField(row.id, 'invoiceAmount', e.target.value)} disabled={row.invoiceGenerated} placeholder="0"
                                    style={{ width: '80px', padding: '6px 8px', fontSize: '13px', fontWeight: '600', border: '1.5px solid #D1D5DB', borderRadius: '6px', textAlign: 'right', backgroundColor: row.invoiceGenerated ? '#F3F4F6' : '#FFFFFF' }} />
                                </td>
                                
                                <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                                  {row.invoiceGenerated ? (
                                    <StatusBadge status={row.invoiceType} small />
                                  ) : row.toBeBilled === 'Yes' ? (
                                    <select value={row.invoiceType || 'Individual'} onChange={(e) => updateRowField(row.id, 'invoiceType', e.target.value)}
                                      style={{ padding: '6px 6px', fontSize: '11px', fontWeight: '600', border: '2px solid', borderRadius: '6px', borderColor: row.invoiceType === 'Combined' ? '#7C3AED' : '#A5B4FC', backgroundColor: row.invoiceType === 'Combined' ? '#F3E8FF' : '#E0E7FF', color: row.invoiceType === 'Combined' ? '#6B21A8' : '#3730A3', cursor: 'pointer', width: '80px' }}>
                                      <option value="Individual">Individual</option>
                                      <option value="Combined">Combined</option>
                                    </select>
                                  ) : <span style={{ color: '#CBD5E1' }}>-</span>}
                                </td>
                                
                                <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                                  {row.toBeBilled === 'Yes' && !row.invoiceGenerated && row.invoiceAmount && canEdit ? (
                                    row.invoiceType === 'Individual' ? (
                                      <ActionButton icon={Receipt} label="Create" small variant="warning" onClick={() => generateIndividualInvoice(row)} />
                                    ) : (
                                      <ActionButton icon={Merge} label="Combine" small variant="purple" onClick={() => openCombineModal(row)} />
                                    )
                                  ) : (row.toBeBilled === 'Yes' && !row.invoiceGenerated && row.invoiceAmount && isDirector) ? (
                                    <span style={{ fontSize: '10px', color: '#94A3B8' }}>Finance to create</span>
                                  ) : <span style={{ color: '#CBD5E1' }}>-</span>}
                                </td>
                                
                                <td style={{ padding: '12px 14px', backgroundColor: '#EFF6FF' }}>
                                  {row.invoiceNo ? <span style={{ fontWeight: '700', fontSize: '11px', color: row.invoiceType === 'Combined' ? '#7C3AED' : '#1E40AF' }}>{row.invoiceNo}</span> : <span style={{ color: '#CBD5E1' }}>-</span>}
                                </td>
                                
                                <td style={{ padding: '12px 14px', backgroundColor: '#EFF6FF' }}>
                                  {row.invoiceDate ? <span style={{ fontSize: '12px' }}>{formatDate(row.invoiceDate)}</span> : <span style={{ color: '#CBD5E1' }}>-</span>}
                                </td>
                                
                                <td style={{ padding: '12px 14px', textAlign: 'right', backgroundColor: '#EFF6FF' }}>
                                  {row.invoiceTotalAmount ? <span style={{ fontWeight: '700', fontSize: '12px', color: '#059669' }}>{formatCurrencyShort(row.invoiceTotalAmount)}</span> : <span style={{ color: '#CBD5E1' }}>-</span>}
                                </td>
                                
                                <td style={{ padding: '12px 14px', textAlign: 'center', backgroundColor: '#FAF5FF' }}>
                                  {row.combinationCode && row.combinationCode !== 'NA' ? (
                                    <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '700', backgroundColor: '#F3E8FF', color: '#7C3AED', border: '1px solid #DDD6FE' }}>C{row.combinationCode}</span>
                                  ) : <span style={{ color: '#CBD5E1' }}>-</span>}
                                </td>
                                
                                {/* Status/Approve Column */}
                                <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                                  {row.invoiceGenerated ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                      <StatusBadge status={row.invoiceStatus} small />
                                      {(row.invoiceStatus === 'Created' || row.invoiceStatus === 'Need Edits') && (
                                        <button onClick={() => openApprovalModal(row)} style={{ fontSize: '10px', color: isDirector ? '#059669' : '#2874A6', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', fontWeight: isDirector ? '600' : '400' }}>
                                          {isDirector ? (row.invoiceStatus === 'Need Edits' ? '✏️ Review & Approve' : '✅ Approve') : 'View Details'}
                                        </button>
                                      )}
                                      {row.editComments && (
                                        <div title={row.editComments} style={{ fontSize: '10px', color: '#DC2626', maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                          💬 {row.editComments}
                                        </div>
                                      )}
                                    </div>
                                  ) : <span style={{ color: '#CBD5E1' }}>-</span>}
                                </td>
                                
                                {/* Actions Column */}
                                <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                                  {row.invoiceGenerated ? (
                                    <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', flexWrap: 'wrap' }}>
                                      <ActionButton icon={Eye} small variant="brand" label="View" onClick={() => downloadInvoice(row)} />
                                      {/* Email - Finance only */}
                                      {canEdit && <ActionButton icon={Mail} small variant="success" disabled={mailDisabled || row.invoiceStatus === 'Need Edits'} onClick={() => { setSelectedRow(row); setShowEmailModal(true); }} />}
                                      {/* Delete - Finance only */}
                                      {canEdit && <ActionButton icon={Trash2} small variant="danger" onClick={() => openDeleteConfirm(row)} />}
                                    </div>
                                  ) : <span style={{ color: '#CBD5E1' }}>-</span>}
                                </td>
                                
                                <td style={{ padding: '10px 14px', textAlign: 'center', backgroundColor: '#F0FDF4' }}>
                                  {row.invoiceGenerated && row.invoiceStatus === 'Approved' ? (
                                    <select value={row.mailingSent || 'No'} onChange={(e) => updateMailingStatus(row.id, e.target.value)} disabled={mailDisabled || isDirector}
                                      style={{ padding: '6px 8px', fontSize: '12px', fontWeight: '600', border: '2px solid', borderRadius: '6px', borderColor: row.mailingSent === 'Yes' ? '#22C55E' : '#E2E8F0', backgroundColor: row.mailingSent === 'Yes' ? '#DCFCE7' : '#FFFFFF', color: row.mailingSent === 'Yes' ? '#166534' : '#64748B', cursor: (mailDisabled || isDirector) ? 'not-allowed' : 'pointer', width: '60px', opacity: (mailDisabled || isDirector) ? 0.5 : 1 }}>
                                      <option value="No">No</option>
                                      <option value="Yes">Yes</option>
                                    </select>
                                  ) : row.invoiceGenerated ? (
                                    <span style={{ fontSize: '10px', color: '#94A3B8' }}>Approve first</span>
                                  ) : <span style={{ color: '#CBD5E1' }}>-</span>}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {masterData.length > 0 && (
          <div style={{ marginTop: '16px', padding: '16px 20px', backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '24px', fontSize: '14px', color: '#475569' }}>
              <span>📊 Total: <strong>{filteredData.length}</strong></span>
              <span>✅ To Bill: <strong>{filteredData.filter(r => r.toBeBilled === 'Yes').length}</strong></span>
              <span>🧾 Invoiced: <strong>{filteredData.filter(r => r.invoiceGenerated).length}</strong></span>
              <span>✅ Approved: <strong>{filteredData.filter(r => r.invoiceStatus === 'Approved').length}</strong></span>
            </div>
            <div style={{ fontSize: '18px', fontWeight: '700', color: '#059669' }}>
              Total: {formatCurrency(filteredData.filter(r => r.toBeBilled === 'Yes').reduce((sum, r) => sum + (parseFloat(r.totalWithGst) || 0), 0))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // ============================================
  // RENDER OTHER PAGES
  // ============================================
  
  const renderInvoices = () => {
    const invoiceMap = new Map();
    masterData.filter(r => r.invoiceGenerated).forEach(row => {
      if (!invoiceMap.has(row.invoiceNo)) {
        invoiceMap.set(row.invoiceNo, { 
          invoiceNo: row.invoiceNo, 
          partyName: row.partyName, 
          date: row.invoiceDate, 
          invoiceType: row.invoiceType, 
          combinationCode: row.combinationCode, 
          invoiceStatus: row.invoiceStatus, 
          receiptStatus: row.receiptStatus || 'Pending',
          receiptNo: row.receiptNo,
          campaigns: [row], 
          totalAmount: parseFloat(row.invoiceTotalAmount) || 0 
        });
      } else {
        invoiceMap.get(row.invoiceNo).campaigns.push(row);
      }
    });
    const invoices = Array.from(invoiceMap.values());

    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '700', color: '#1E293B' }}>🧾 Invoice & Receipt Register</h1>
          {isDirector && <span style={{ padding: '8px 16px', backgroundColor: '#FEF3C7', borderRadius: '8px', fontSize: '13px', color: '#92400E', fontWeight: '600' }}>👁️ View Only</span>}
        </div>
        <Card noPadding>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '2px solid #E2E8F0' }}>
                <th style={{ padding: '12px 14px', textAlign: 'left', fontWeight: '700' }}>Invoice No</th>
                <th style={{ padding: '12px 14px', textAlign: 'left', fontWeight: '700' }}>Date</th>
                <th style={{ padding: '12px 14px', textAlign: 'left', fontWeight: '700' }}>Party</th>
                <th style={{ padding: '12px 14px', textAlign: 'center', fontWeight: '700' }}>Type</th>
                <th style={{ padding: '12px 14px', textAlign: 'center', fontWeight: '700' }}>Campaigns</th>
                <th style={{ padding: '12px 14px', textAlign: 'right', fontWeight: '700' }}>Amount</th>
                <th style={{ padding: '12px 14px', textAlign: 'center', fontWeight: '700' }}>Inv. Status</th>
                <th style={{ padding: '12px 14px', textAlign: 'center', fontWeight: '700' }}>Receipt Status</th>
                <th style={{ padding: '12px 14px', textAlign: 'center', fontWeight: '700' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.length === 0 ? (
                <tr><td colSpan="9" style={{ padding: '50px', textAlign: 'center', color: '#94A3B8' }}>No invoices generated yet</td></tr>
              ) : (
                invoices.map(inv => (
                  <tr key={inv.invoiceNo} style={{ borderBottom: '1px solid #F1F5F9', backgroundColor: inv.invoiceType === 'Combined' ? '#FAF5FF' : 'transparent' }}>
                    <td style={{ padding: '12px 14px', fontWeight: '700', color: inv.invoiceType === 'Combined' ? '#7C3AED' : '#2874A6' }}>{inv.invoiceNo}</td>
                    <td style={{ padding: '12px 14px' }}>{formatDate(inv.date)}</td>
                    <td style={{ padding: '12px 14px' }}>{inv.partyName}</td>
                    <td style={{ padding: '12px 14px', textAlign: 'center' }}><StatusBadge status={inv.invoiceType} small /></td>
                    <td style={{ padding: '12px 14px', textAlign: 'center' }}><span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '600', backgroundColor: '#E0E7FF', color: '#3730A3' }}>{inv.campaigns.length}</span></td>
                    <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: '700', fontSize: '14px' }}>{formatCurrency(inv.totalAmount)}</td>
                    <td style={{ padding: '12px 14px', textAlign: 'center' }}><StatusBadge status={inv.invoiceStatus} small /></td>
                    <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                      {inv.receiptStatus === 'Received' ? (
                        <span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '700', backgroundColor: '#DCFCE7', color: '#166534' }}>✅ {inv.receiptNo || 'Received'}</span>
                      ) : (
                        <span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '600', backgroundColor: '#FEF3C7', color: '#92400E' }}>⏳ Pending</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', flexWrap: 'wrap' }}>
                        {/* View Invoice */}
                        <ActionButton icon={Eye} small variant="brand" onClick={() => downloadInvoice(inv.campaigns[0])} title="View Invoice" />
                        
                        {/* Receipt - only for finance, approved invoices, not yet received */}
                        {canEdit && inv.invoiceStatus === 'Approved' && inv.receiptStatus !== 'Received' && (
                          <ActionButton icon={Receipt} small variant="success" onClick={() => openReceiptModal(inv.campaigns[0])} title="Create Receipt" />
                        )}
                        
                        {/* Credit Note - only for finance */}
                        {canEdit && inv.invoiceStatus === 'Approved' && (
                          <ActionButton icon={FileText} small variant="primary" onClick={() => openCreditNoteModal(inv.campaigns[0])} title="Credit Note" />
                        )}
                        
                        {/* Delete - only for finance */}
                        {canEdit && (
                          <ActionButton icon={Trash2} small variant="danger" onClick={() => openDeleteConfirm(inv.campaigns[0])} title="Delete" />
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </Card>
      </div>
    );
  };

  const renderLedgers = () => {
    const getPartyBalance = (party) => {
      const opening = openingBalances[party] || 0;
      const ledgerBal = ledgerEntries.filter(e => e.partyName === party).reduce((sum, e) => sum + e.debit - e.credit, 0);
      return opening + ledgerBal;
    };

    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '700', color: '#1E293B' }}>📚 Party Ledgers</h1>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {isDirector && <span style={{ padding: '8px 16px', backgroundColor: '#FEF3C7', borderRadius: '8px', fontSize: '13px', color: '#92400E', fontWeight: '600' }}>👁️ View Only</span>}
            {canEdit && <ActionButton icon={Plus} label="Opening Balance" variant="primary" onClick={() => setShowOpeningBalanceModal(true)} />}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '16px' }}>
          <Card title="Parties" noPadding>
            <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
              {parties.length === 0 ? <div style={{ padding: '30px', textAlign: 'center', color: '#94A3B8', fontSize: '14px' }}>No parties yet</div> : (
                parties.map(party => {
                  const balance = getPartyBalance(party);
                  return (
                    <div key={party} onClick={() => setSelectedParty(party)} style={{ padding: '14px 18px', borderBottom: '1px solid #F1F5F9', cursor: 'pointer', backgroundColor: selectedParty === party ? '#EFF6FF' : 'transparent', borderLeft: selectedParty === party ? '4px solid #2874A6' : '4px solid transparent' }}>
                      <div style={{ fontWeight: '600', fontSize: '14px', color: '#1E293B' }}>{party}</div>
                      <div style={{ fontSize: '14px', color: balance > 0 ? '#DC2626' : '#059669', fontWeight: '700', marginTop: '4px' }}>{balance > 0 ? 'Dr. ' : 'Cr. '}{formatCurrency(Math.abs(balance))}</div>
                    </div>
                  );
                })
              )}
            </div>
          </Card>
          <Card title={selectedParty || 'Select a Party'} noPadding>
            {partyLedger.length > 0 ? (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F8FAFC' }}>
                    <th style={{ padding: '12px 14px', textAlign: 'left', fontWeight: '700', width: '90px' }}>Date</th>
                    <th style={{ padding: '12px 14px', textAlign: 'left', fontWeight: '700' }}>Particulars</th>
                    <th style={{ padding: '12px 14px', textAlign: 'left', fontWeight: '700' }}>Narration</th>
                    <th style={{ padding: '12px 14px', textAlign: 'right', fontWeight: '700', width: '100px' }}>Debit</th>
                    <th style={{ padding: '12px 14px', textAlign: 'right', fontWeight: '700', width: '100px' }}>Credit</th>
                    <th style={{ padding: '12px 14px', textAlign: 'right', fontWeight: '700', width: '120px' }}>Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {partyLedger.map(entry => (
                    <tr key={entry.id} style={{ borderBottom: '1px solid #F1F5F9', backgroundColor: entry.isOpening ? '#FEF3C7' : (entry.type === 'receipt' ? '#F0FDF4' : (entry.type === 'creditnote' ? '#FEF2F2' : 'transparent')) }}>
                      <td style={{ padding: '12px 14px' }}>{entry.isOpening ? '-' : formatDate(entry.date)}</td>
                      <td style={{ padding: '12px 14px', fontWeight: entry.isOpening ? '600' : '500' }}>{entry.particulars}</td>
                      <td style={{ padding: '12px 14px', fontSize: '12px', color: '#64748B' }}>{entry.narration || '-'}</td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', color: '#DC2626', fontWeight: '600' }}>{entry.debit > 0 ? formatCurrency(entry.debit) : '-'}</td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', color: '#059669', fontWeight: '600' }}>{entry.credit > 0 ? formatCurrency(entry.credit) : '-'}</td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: '700', color: entry.balance > 0 ? '#DC2626' : '#059669' }}>{entry.balance > 0 ? 'Dr. ' : 'Cr. '}{formatCurrency(Math.abs(entry.balance))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <div style={{ padding: '60px', textAlign: 'center', color: '#94A3B8' }}>{selectedParty ? 'No entries' : 'Select a party'}</div>}
          </Card>
        </div>
      </div>
    );
  };

  const renderReports = () => {
    const totalInvoiced = masterData.filter(r => r.invoiceGenerated).reduce((sum, r) => sum + (parseFloat(r.invoiceTotalAmount) || 0), 0);
    const totalPaid = masterData.filter(r => r.invoiceStatus === 'Paid').reduce((sum, r) => sum + (parseFloat(r.invoiceTotalAmount) || 0), 0);
    const totalApproved = masterData.filter(r => r.invoiceStatus === 'Approved').reduce((sum, r) => sum + (parseFloat(r.invoiceTotalAmount) || 0), 0);
    const needEdits = masterData.filter(r => r.invoiceStatus === 'Need Edits').length;
    
    return (
      <div>
        <h1 style={{ margin: '0 0 16px', fontSize: '24px', fontWeight: '700', color: '#1E293B' }}>📈 Reports</h1>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
          <Card><div style={{ fontSize: '14px', color: '#64748B', marginBottom: '8px' }}>Total Invoiced</div><div style={{ fontSize: '24px', fontWeight: '700', color: '#1E293B' }}>{formatCurrency(totalInvoiced)}</div></Card>
          <Card><div style={{ fontSize: '14px', color: '#64748B', marginBottom: '8px' }}>Approved</div><div style={{ fontSize: '24px', fontWeight: '700', color: '#059669' }}>{formatCurrency(totalApproved)}</div></Card>
          <Card><div style={{ fontSize: '14px', color: '#64748B', marginBottom: '8px' }}>Need Edits</div><div style={{ fontSize: '24px', fontWeight: '700', color: '#DC2626' }}>{needEdits} invoices</div></Card>
          <Card><div style={{ fontSize: '14px', color: '#64748B', marginBottom: '8px' }}>Paid</div><div style={{ fontSize: '24px', fontWeight: '700', color: '#059669' }}>{formatCurrency(totalPaid)}</div></Card>
        </div>
      </div>
    );
  };

  const renderSettings = () => (
    <div>
      <h1 style={{ margin: '0 0 16px', fontSize: '24px', fontWeight: '700', color: '#1E293B' }}>⚙️ Settings</h1>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <Card title="📝 Invoice Series">
          <InputField label="Invoice Prefix" value={companyConfig.invoicePrefix} onChange={(e) => setCompanyConfig(prev => ({ ...prev, invoicePrefix: e.target.value }))} small />
          <InputField label="Next Invoice Number" type="number" value={nextInvoiceNo} onChange={(e) => setNextInvoiceNo(parseInt(e.target.value) || 1)} small />
          <InputField label="Next Combine Code" type="number" value={nextCombineNo} onChange={(e) => setNextCombineNo(parseInt(e.target.value) || 1)} small />
          <div style={{ padding: '10px', backgroundColor: '#EFF6FF', borderRadius: '8px', fontSize: '14px' }}><strong>Preview:</strong> {companyConfig.invoicePrefix}{nextInvoiceNo}</div>
        </Card>
        <Card title="🖼️ Mailer Logo">
          <input type="file" ref={logoInputRef} accept="image/*" style={{ display: 'none' }} onChange={handleLogoUpload} />
          {mailerLogo ? (
            <div style={{ textAlign: 'center' }}>
              <img src={mailerLogo} alt="Logo" style={{ maxWidth: '250px', maxHeight: '60px', marginBottom: '12px', border: '1px solid #E2E8F0', padding: '8px', borderRadius: '8px' }} />
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                <ActionButton icon={RefreshCw} label="Change" small onClick={() => logoInputRef.current?.click()} />
                <ActionButton icon={Trash2} label="Remove" variant="danger" small onClick={() => setMailerLogo(null)} />
              </div>
            </div>
          ) : (
            <div onClick={() => logoInputRef.current?.click()} style={{ border: '2px dashed #CBD5E1', borderRadius: '10px', padding: '30px', textAlign: 'center', cursor: 'pointer' }}>
              <Upload size={32} color="#94A3B8" style={{ marginBottom: '8px' }} /><p style={{ margin: 0, color: '#64748B', fontSize: '14px' }}>Click to upload</p>
            </div>
          )}
        </Card>
        <Card title="💰 Default Invoice Values">
          <input type="file" ref={invoiceValueInputRef} accept=".xlsx,.xls,.csv" style={{ display: 'none' }} onChange={handleInvoiceValueUpload} />
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
            <ActionButton icon={Upload} label="Upload" variant="brand" small onClick={() => invoiceValueInputRef.current?.click()} />
            <ActionButton icon={Download} label="Template" small onClick={downloadInvoiceValueTemplate} />
          </div>
          {Object.keys(invoiceValues).length > 0 && (
            <div style={{ maxHeight: '180px', overflowY: 'auto', border: '1px solid #E2E8F0', borderRadius: '8px' }}>
              {Object.entries(invoiceValues).map(([party, amount]) => (
                <div key={party} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', borderBottom: '1px solid #F1F5F9', fontSize: '13px' }}>
                  <span>{party}</span><span style={{ fontWeight: '700' }}>{formatCurrency(amount)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
        <Card title="🗑️ Data Management">
          <div style={{ padding: '16px', backgroundColor: '#FEF2F2', borderRadius: '10px', border: '1px solid #FCA5A5', marginBottom: '16px' }}>
            <div style={{ fontWeight: '700', color: '#991B1B', fontSize: '14px', marginBottom: '8px' }}>⚠️ Danger Zone</div>
            <div style={{ fontSize: '13px', color: '#7F1D1D', marginBottom: '16px' }}>
              This will permanently delete all data including:
              <ul style={{ margin: '8px 0 0 16px', padding: 0 }}>
                <li>All campaigns and master data</li>
                <li>All invoices and receipts</li>
                <li>All ledger entries</li>
                <li>All mailer images</li>
                <li>Opening balances and settings</li>
              </ul>
            </div>
            <ActionButton icon={Trash2} label="Clear All Data" variant="danger" onClick={() => setShowClearDataModal(true)} />
          </div>
          <div style={{ fontSize: '12px', color: '#64748B' }}>
            <strong>Current Data:</strong><br />
            • {masterData.length} campaigns<br />
            • {ledgerEntries.length} ledger entries<br />
            • {receipts.length} receipts<br />
            • {Object.keys(mailerImages).length} mailer images
          </div>
        </Card>
      </div>
    </div>
  );

  // ============================================
  // RENDER MODALS
  // ============================================
  
  const renderModals = () => (
    <>
      {/* Invoice Viewer Modal */}
      <Modal isOpen={showInvoiceViewer} onClose={() => { setShowInvoiceViewer(false); setCurrentInvoiceHtml(''); }} title="📄 Invoice Preview" width="950px">
        {selectedRow && currentInvoiceHtml && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', padding: '14px 18px', backgroundColor: '#DCFCE7', borderRadius: '10px', border: '2px solid #22C55E' }}>
              <div>
                <span style={{ fontWeight: '700', fontSize: '16px', color: '#166534' }}>Invoice: {selectedRow.invoiceNo}</span>
                {selectedRow.invoiceType === 'Combined' && (
                  <span style={{ marginLeft: '12px', padding: '4px 10px', backgroundColor: '#7C3AED', color: 'white', borderRadius: '6px', fontSize: '12px', fontWeight: '600' }}>Combined - C{selectedRow.combinationCode}</span>
                )}
              </div>
              <button
                onClick={() => downloadInvoiceFile(selectedRow)}
                style={{
                  padding: '14px 28px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  border: 'none',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  backgroundColor: '#22C55E',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  boxShadow: '0 2px 8px rgba(34, 197, 94, 0.4)'
                }}
              >
                <Download size={20} />
                Download Invoice
              </button>
            </div>
            <div style={{ border: '2px solid #E2E8F0', borderRadius: '10px', overflow: 'hidden', backgroundColor: '#f5f5f5' }}>
              <iframe
                id="invoice-viewer-iframe"
                srcDoc={currentInvoiceHtml}
                style={{ width: '100%', height: '480px', border: 'none', backgroundColor: 'white' }}
                title="Invoice Preview"
              />
            </div>
            <div style={{ marginTop: '12px', padding: '14px 18px', backgroundColor: '#FEF3C7', borderRadius: '10px', border: '1px solid #FCD34D' }}>
              <div style={{ fontSize: '14px', color: '#92400E', fontWeight: '600', marginBottom: '6px' }}>📥 How to Save as PDF:</div>
              <ol style={{ fontSize: '13px', color: '#92400E', margin: '0', paddingLeft: '20px', lineHeight: '1.8' }}>
                <li>Click <strong>"Download Invoice"</strong> button above</li>
                <li>Open the downloaded <strong>.html file</strong> in Chrome/Edge browser</li>
                <li>Print dialog will open automatically - select <strong>"Save as PDF"</strong></li>
                <li>Click <strong>Save</strong> to get your PDF!</li>
              </ol>
            </div>
          </div>
        )}
      </Modal>
      
      {/* Remove unused print view */}

      {/* Approval Modal - Enhanced with 3 Confirmations */}
      <Modal isOpen={showApprovalModal} onClose={() => { setShowApprovalModal(false); setEditComments(''); setApprovalChecks({ particularsApproved: false, emailApproved: false, invoiceTypeApproved: false }); }} title={isDirector ? "📋 Review & Approve Invoice" : "📋 Invoice Details"} width="550px">
        {selectedRow && (
          <div>
            <div style={{ backgroundColor: '#EFF6FF', padding: '14px', borderRadius: '10px', marginBottom: '16px' }}>
              <div style={{ fontSize: '14px', marginBottom: '4px' }}><strong>Invoice:</strong> {selectedRow.invoiceNo}</div>
              <div style={{ fontSize: '14px', marginBottom: '4px' }}><strong>Party:</strong> {selectedRow.partyName}</div>
              <div style={{ fontSize: '14px', marginBottom: '4px' }}><strong>Amount:</strong> {formatCurrency(selectedRow.invoiceTotalAmount)}</div>
              <div style={{ fontSize: '14px', marginBottom: '4px' }}><strong>Email:</strong> {selectedRow.emailId || 'Not set'}</div>
              <div style={{ fontSize: '14px' }}><strong>Invoice Type:</strong> <span style={{ color: selectedRow.invoiceType === 'Combined' ? '#7C3AED' : '#2874A6', fontWeight: '600' }}>{selectedRow.invoiceType || 'Individual'}</span></div>
              {selectedRow.invoiceType === 'Combined' && (
                <div style={{ marginTop: '8px', fontSize: '13px', color: '#7C3AED' }}>
                  <strong>Combined Campaigns:</strong> {getCombinedCampaigns(selectedRow).map(c => c.senderName).join(', ')}
                </div>
              )}
            </div>
            
            {selectedRow.editComments && (
              <div style={{ backgroundColor: '#FEE2E2', padding: '12px', borderRadius: '8px', marginBottom: '16px', border: '1px solid #FCA5A5' }}>
                <div style={{ fontWeight: '600', color: '#991B1B', fontSize: '13px', marginBottom: '4px' }}>Previous Comments:</div>
                <div style={{ fontSize: '13px', color: '#7F1D1D' }}>{selectedRow.editComments}</div>
              </div>
            )}
            
            {/* 3 Approval Confirmations - Director Only */}
            {isDirector ? (
              <div style={{ backgroundColor: '#F0FDF4', padding: '16px', borderRadius: '10px', marginBottom: '16px', border: '1px solid #86EFAC' }}>
                <div style={{ fontWeight: '700', color: '#166534', fontSize: '14px', marginBottom: '12px' }}>✅ Approval Confirmations</div>
                
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '12px', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={approvalChecks.particularsApproved}
                    onChange={(e) => setApprovalChecks(prev => ({ ...prev, particularsApproved: e.target.checked }))}
                    style={{ marginTop: '2px', width: '18px', height: '18px', accentColor: '#059669' }}
                  />
                  <div>
                    <div style={{ fontWeight: '600', fontSize: '13px', color: '#166534' }}>1. Particulars & Amount Approved</div>
                    <div style={{ fontSize: '12px', color: '#15803D' }}>I confirm that the invoice particulars and amount ({formatCurrency(selectedRow.invoiceTotalAmount)}) are correct.</div>
                  </div>
                </label>
                
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '12px', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={approvalChecks.emailApproved}
                    onChange={(e) => setApprovalChecks(prev => ({ ...prev, emailApproved: e.target.checked }))}
                    style={{ marginTop: '2px', width: '18px', height: '18px', accentColor: '#059669' }}
                  />
                  <div>
                    <div style={{ fontWeight: '600', fontSize: '13px', color: '#166534' }}>2. Email ID Approved for Mailing</div>
                    <div style={{ fontSize: '12px', color: '#15803D' }}>I confirm that <strong>{selectedRow.emailId || 'the specified email'}</strong> should be used for mailing.</div>
                  </div>
                </label>
                
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={approvalChecks.invoiceTypeApproved}
                    onChange={(e) => setApprovalChecks(prev => ({ ...prev, invoiceTypeApproved: e.target.checked }))}
                    style={{ marginTop: '2px', width: '18px', height: '18px', accentColor: '#059669' }}
                  />
                  <div>
                    <div style={{ fontWeight: '600', fontSize: '13px', color: '#166534' }}>3. Invoice Type Confirmed</div>
                    <div style={{ fontSize: '12px', color: '#15803D' }}>
                      {selectedRow.invoiceType === 'Combined' 
                        ? `I confirm that a Combined Invoice is required for these ${getCombinedCampaigns(selectedRow).length} campaigns.`
                        : 'I confirm that an Individual Invoice is required (not combined with others).'}
                    </div>
                  </div>
                </label>
              </div>
            ) : (
              <div style={{ backgroundColor: '#FEF3C7', padding: '16px', borderRadius: '10px', marginBottom: '16px', border: '1px solid #FCD34D' }}>
                <div style={{ fontWeight: '600', color: '#92400E', fontSize: '14px' }}>⚠️ Director Approval Required</div>
                <div style={{ fontSize: '13px', color: '#A16207', marginTop: '6px' }}>Only the Director can approve or reject invoices. You can view the invoice details above.</div>
              </div>
            )}
            
            {isDirector && (
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>Remarks / Comments (required for Need Edits)</label>
                <textarea
                  value={editComments}
                  onChange={(e) => setEditComments(e.target.value)}
                  placeholder="Enter comments for required changes..."
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1.5px solid #D1D5DB', fontSize: '13px', minHeight: '80px', resize: 'vertical', boxSizing: 'border-box' }}
                />
              </div>
            )}
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <ActionButton label="Close" onClick={() => { setShowApprovalModal(false); setEditComments(''); setApprovalChecks({ particularsApproved: false, emailApproved: false, invoiceTypeApproved: false }); }} />
              {isDirector && (
                <>
                  <ActionButton label="Need Edits" variant="danger" icon={Edit3} onClick={handleNeedEdits} />
                  <ActionButton label="Approve" variant="success" icon={ThumbsUp} onClick={handleApprove} />
                </>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal isOpen={showDeleteConfirmModal} onClose={() => setShowDeleteConfirmModal(false)} title="🗑️ Delete Invoice" width="450px">
        {selectedRow && (
          <div>
            <div style={{ backgroundColor: '#FEE2E2', padding: '16px', borderRadius: '10px', marginBottom: '16px', border: '1px solid #FCA5A5' }}>
              <div style={{ fontWeight: '700', color: '#991B1B', fontSize: '15px', marginBottom: '8px' }}>⚠️ Are you sure?</div>
              <div style={{ fontSize: '14px', color: '#7F1D1D', lineHeight: '1.5' }}>
                This will delete invoice <strong>{selectedRow.invoiceNo}</strong> and reset the campaign(s) to allow re-generation.
                {selectedRow.invoiceType === 'Combined' && (
                  <div style={{ marginTop: '8px' }}>
                    <strong>All {getCombinedCampaigns(selectedRow).length} combined campaigns</strong> will be reset to Individual type for re-selection.
                  </div>
                )}
              </div>
            </div>
            
            <div style={{ backgroundColor: '#F8FAFC', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>
              <div style={{ fontSize: '13px' }}><strong>Invoice:</strong> {selectedRow.invoiceNo}</div>
              <div style={{ fontSize: '13px' }}><strong>Party:</strong> {selectedRow.partyName}</div>
              <div style={{ fontSize: '13px' }}><strong>Amount:</strong> {formatCurrency(selectedRow.invoiceTotalAmount)}</div>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <ActionButton label="Cancel" onClick={() => setShowDeleteConfirmModal(false)} />
              <ActionButton label="Delete Invoice" variant="danger" icon={Trash2} onClick={handleDeleteInvoice} />
            </div>
          </div>
        )}
      </Modal>

      {/* Add Email Modal */}
      <Modal isOpen={showAddEmailModal} onClose={() => setShowAddEmailModal(false)} title="➕ Add Email Address" width="400px">
        {selectedRow && (
          <div>
            <div style={{ backgroundColor: '#EFF6FF', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>
              <div style={{ fontSize: '13px' }}><strong>Campaign:</strong> {selectedRow.senderName}</div>
              <div style={{ fontSize: '13px', marginTop: '4px' }}><strong>Current:</strong> {selectedRow.emailId || 'None'}</div>
            </div>
            <InputField label="Additional Email Address" type="email" value={newEmailInput} onChange={(e) => setNewEmailInput(e.target.value)} placeholder="email@example.com" small />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
              <ActionButton label="Cancel" onClick={() => setShowAddEmailModal(false)} />
              <ActionButton label="Add Email" variant="brand" icon={PlusCircle} onClick={() => {
                if (newEmailInput && newEmailInput.includes('@')) {
                  addEmailToRow(selectedRow.id, newEmailInput);
                  setShowAddEmailModal(false);
                  setNewEmailInput('');
                } else {
                  alert('Please enter a valid email address');
                }
              }} />
            </div>
          </div>
        )}
      </Modal>

      {/* Combine Modal */}
      <Modal isOpen={showCombineModal} onClose={() => { setShowCombineModal(false); setSelectedForCombine(new Set()); setCombineParty(null); }} title="🔗 Combine Invoices" width="700px">
        {combineParty && (
          <div>
            <div style={{ backgroundColor: '#F3E8FF', padding: '14px 18px', borderRadius: '10px', marginBottom: '16px' }}>
              <div style={{ fontSize: '15px', fontWeight: '700', color: '#6B21A8' }}>Party: {combineParty}</div>
              <div style={{ fontSize: '13px', color: '#7C3AED', marginTop: '4px' }}>Select 2+ campaigns to combine into a single invoice</div>
            </div>
            <div style={{ maxHeight: '350px', overflowY: 'auto', border: '1px solid #E2E8F0', borderRadius: '10px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead><tr style={{ backgroundColor: '#F8FAFC', position: 'sticky', top: 0 }}><th style={{ padding: '12px', textAlign: 'center', width: '50px' }}>✓</th><th style={{ padding: '12px', textAlign: 'left' }}>Sender</th><th style={{ padding: '12px', textAlign: 'left' }}>Subject</th><th style={{ padding: '12px', textAlign: 'left' }}>Date</th><th style={{ padding: '12px', textAlign: 'right' }}>Amount</th></tr></thead>
                <tbody>
                  {getUnbilledCampaignsForParty(combineParty).map(row => (
                    <tr key={row.id} style={{ borderBottom: '1px solid #F1F5F9', backgroundColor: selectedForCombine.has(row.id) ? '#F3E8FF' : 'transparent', cursor: 'pointer' }} onClick={() => toggleCombineSelection(row.id)}>
                      <td style={{ padding: '12px', textAlign: 'center' }}><input type="checkbox" checked={selectedForCombine.has(row.id)} onChange={() => {}} style={{ width: '18px', height: '18px', cursor: 'pointer' }} /></td>
                      <td style={{ padding: '12px', fontWeight: '600' }}>{row.senderName}</td>
                      <td style={{ padding: '12px', color: '#64748B' }}>{row.subject?.substring(0, 35)}...</td>
                      <td style={{ padding: '12px' }}>{formatDate(row.date)}</td>
                      <td style={{ padding: '12px', textAlign: 'right', fontWeight: '700' }}>{formatCurrency(row.totalWithGst)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ backgroundColor: '#EFF6FF', padding: '14px 18px', borderRadius: '10px', marginTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '14px', color: '#64748B' }}>Selected: <strong>{selectedForCombine.size}</strong> | Combine Code: <strong>C{nextCombineNo}</strong></div>
              <div style={{ fontSize: '18px', fontWeight: '700', color: '#2874A6' }}>Total: {formatCurrency(masterData.filter(r => selectedForCombine.has(r.id)).reduce((sum, r) => sum + (parseFloat(r.totalWithGst) || 0), 0))}</div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
              <ActionButton label="Cancel" onClick={() => { setShowCombineModal(false); setSelectedForCombine(new Set()); }} />
              <ActionButton label="Create Combined Invoice" variant="purple" icon={Receipt} disabled={selectedForCombine.size < 2} onClick={generateCombinedInvoice} />
            </div>
          </div>
        )}
      </Modal>

      {/* Upload Modal */}
      <Modal isOpen={showUploadModal} onClose={() => { setShowUploadModal(false); setPastedImage(null); setReplaceMode(false); }} title={replaceMode ? "🔄 Replace Mailer" : "📷 Upload Mailer"} width="550px">
        <input type="file" ref={imageInputRef} accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />
        {selectedRow && (
          <div>
            <div style={{ backgroundColor: '#EFF6FF', padding: '14px', borderRadius: '10px', marginBottom: '14px' }}>
              <div style={{ fontSize: '14px' }}><strong>Sender:</strong> {selectedRow.senderName}</div>
              <div style={{ fontSize: '14px', marginTop: '4px' }}><strong>Subject:</strong> {selectedRow.subject}</div>
            </div>
            {replaceMode && mailerImages[selectedRow.id] && (
              <div style={{ backgroundColor: '#FEF3C7', padding: '12px', borderRadius: '10px', marginBottom: '14px', border: '1px solid #FCD34D' }}>
                <div style={{ fontWeight: '600', color: '#92400E', fontSize: '13px' }}>⚠️ This will replace {mailerImages[selectedRow.id].length} existing image(s)</div>
              </div>
            )}
            <div style={{ backgroundColor: '#FEF3C7', padding: '14px', borderRadius: '10px', marginBottom: '14px', border: '1px solid #FCD34D' }}>
              <div style={{ fontWeight: '700', color: '#92400E', marginBottom: '8px', fontSize: '14px' }}>Step 1: Find Mailer in Gmail</div>
              <button onClick={() => openGmailSearch(selectedRow.subject)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', backgroundColor: '#EA4335', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' }}>
                <ExternalLink size={16} /> Search in Gmail
              </button>
            </div>
            <div style={{ backgroundColor: '#F0FDF4', padding: '14px', borderRadius: '10px', border: '1px solid #86EFAC' }}>
              <div style={{ fontWeight: '700', color: '#166534', marginBottom: '8px', fontSize: '14px' }}>Step 2: Paste Screenshot</div>
              <div ref={pasteAreaRef} tabIndex={0} onPaste={handlePaste} onClick={() => pasteAreaRef.current?.focus()} style={{ border: pastedImage ? '3px solid #22C55E' : '3px dashed #22C55E', borderRadius: '10px', padding: pastedImage ? '8px' : '30px', textAlign: 'center', cursor: 'pointer', backgroundColor: pastedImage ? '#FFFFFF' : '#ECFDF5', minHeight: '100px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', outline: 'none' }}>
                {pastedImage ? (
                  <>
                    <img src={pastedImage} alt="Pasted" style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '8px', marginBottom: '10px' }} />
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <ActionButton icon={Check} label="Save" variant="success" onClick={() => saveMailerImage(pastedImage)} />
                      <ActionButton icon={Trash2} label="Clear" variant="danger" onClick={() => setPastedImage(null)} />
                    </div>
                  </>
                ) : (
                  <>
                    <Clipboard size={36} color="#22C55E" style={{ marginBottom: '8px' }} />
                    <div style={{ fontWeight: '700', fontSize: '14px', color: '#166534' }}>Click here & Press Ctrl+V</div>
                  </>
                )}
              </div>
              <div style={{ textAlign: 'center', marginTop: '12px' }}>
                <span style={{ color: '#64748B', fontSize: '13px' }}>— OR —</span>
                <div style={{ marginTop: '8px' }}><ActionButton icon={Upload} label="Browse Files" onClick={() => imageInputRef.current?.click()} /></div>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Email Modal */}
      <Modal isOpen={showEmailModal} onClose={() => setShowEmailModal(false)} title="📧 Send Invoice Email" width="600px">
        {selectedRow && (
          <div>
            <div style={{ display: 'flex', gap: '0', marginBottom: '16px', border: '2px solid #E2E8F0', borderRadius: '8px', overflow: 'hidden' }}>
              <button onClick={() => setEmailMode('reply')} style={{ flex: 1, padding: '12px', backgroundColor: emailMode === 'reply' ? '#2874A6' : '#F8FAFC', color: emailMode === 'reply' ? 'white' : '#64748B', border: 'none', cursor: 'pointer', fontWeight: '700', fontSize: '14px' }}>↩️ Reply to Thread</button>
              <button onClick={() => setEmailMode('new')} style={{ flex: 1, padding: '12px', backgroundColor: emailMode === 'new' ? '#2874A6' : '#F8FAFC', color: emailMode === 'new' ? 'white' : '#64748B', border: 'none', cursor: 'pointer', fontWeight: '700', fontSize: '14px' }}>✉️ New Email</button>
            </div>
            
            <div style={{ backgroundColor: '#EFF6FF', padding: '14px', borderRadius: '10px', marginBottom: '16px' }}>
              <div style={{ fontSize: '14px', marginBottom: '4px' }}><strong>Invoice:</strong> {selectedRow.invoiceNo}</div>
              <div style={{ fontSize: '14px', marginBottom: '4px' }}><strong>Amount:</strong> {formatCurrency(selectedRow.invoiceTotalAmount || selectedRow.totalWithGst)}</div>
              {selectedRow.invoiceType === 'Combined' && (
                <div style={{ fontSize: '13px', marginTop: '8px', color: '#7C3AED' }}>
                  <strong>Campaigns:</strong> {getCombinedCampaigns(selectedRow).map(c => c.senderName).join(', ')}
                </div>
              )}
              <div style={{ fontSize: '14px', marginTop: '8px' }}><strong>Recipients:</strong></div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                {getAllEmails(selectedRow).map((email, i) => (
                  <span key={i} style={{ padding: '4px 10px', backgroundColor: '#DBEAFE', borderRadius: '6px', fontSize: '13px', color: '#1E40AF' }}>{email}</span>
                ))}
                {getAllEmails(selectedRow).length === 0 && <span style={{ color: '#94A3B8' }}>No email addresses</span>}
              </div>
            </div>
            
            {emailMode === 'reply' ? (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontWeight: '700', fontSize: '14px' }}>Email Body:</span>
                  <button onClick={() => { navigator.clipboard.writeText(generateEmailBody(selectedRow)); alert('✅ Copied!'); }} style={{ padding: '6px 14px', backgroundColor: '#22C55E', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>📋 Copy</button>
                </div>
                <div style={{ fontSize: '13px', backgroundColor: '#F8FAFC', padding: '14px', borderRadius: '10px', whiteSpace: 'pre-wrap', maxHeight: '200px', overflowY: 'auto', fontFamily: 'monospace', border: '1px solid #E2E8F0', lineHeight: '1.5' }}>{generateEmailBody(selectedRow)}</div>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => { const allEmails = getAllEmails(selectedRow); const to = encodeURIComponent(allEmails.join(',')); const subject = encodeURIComponent(generateEmailSubject(selectedRow)); const body = encodeURIComponent(generateEmailBody(selectedRow)); window.open(`https://mail.google.com/mail/?view=cm&to=${to}&su=${subject}&body=${body}`, '_blank'); }} style={{ padding: '12px 20px', backgroundColor: '#EA4335', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '700' }}>📧 Open Gmail</button>
                <button onClick={() => { const allEmails = getAllEmails(selectedRow); const to = encodeURIComponent(allEmails.join(';')); const subject = encodeURIComponent(generateEmailSubject(selectedRow)); const body = encodeURIComponent(generateEmailBody(selectedRow)); window.open(`https://outlook.live.com/mail/0/deeplink/compose?to=${to}&subject=${subject}&body=${body}`, '_blank'); }} style={{ padding: '12px 20px', backgroundColor: '#0078D4', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '700' }}>📧 Open Outlook</button>
              </div>
            )}
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
              <ActionButton label="View Invoice" icon={Eye} onClick={() => { setShowEmailModal(false); downloadInvoice(selectedRow); }} />
              <ActionButton label="Close" onClick={() => setShowEmailModal(false)} />
            </div>
          </div>
        )}
      </Modal>

      {/* Payment Modal */}
      <Modal isOpen={showPaymentModal} onClose={() => setShowPaymentModal(false)} title="💳 Record Payment" width="500px">
        {selectedRow && (
          <div>
            <div style={{ backgroundColor: '#F0FDF4', padding: '14px', borderRadius: '10px', marginBottom: '16px' }}>
              <div style={{ fontSize: '14px' }}><strong>Invoice:</strong> {selectedRow.invoiceNo}</div>
              <div style={{ fontSize: '14px', marginTop: '4px' }}><strong>Party:</strong> {selectedRow.partyName}</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <InputField label="Payment Amount" type="number" value={paymentForm.amount} onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })} small />
              <InputField label="Date" type="date" value={paymentForm.date} onChange={(e) => setPaymentForm({ ...paymentForm, date: e.target.value })} small />
            </div>
            <SelectField label="Payment Mode" value={paymentForm.mode} onChange={(e) => setPaymentForm({ ...paymentForm, mode: e.target.value })} options={[{ value: 'Bank', label: 'Bank Transfer' }, { value: 'UPI', label: 'UPI' }, { value: 'Cheque', label: 'Cheque' }, { value: 'Cash', label: 'Cash' }]} small />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <InputField label="TDS Deducted" type="number" value={paymentForm.tds} onChange={(e) => setPaymentForm({ ...paymentForm, tds: e.target.value })} placeholder="0" small />
              <InputField label="Discount" type="number" value={paymentForm.discount} onChange={(e) => setPaymentForm({ ...paymentForm, discount: e.target.value })} placeholder="0" small />
            </div>
            <InputField label="Narration" value={paymentForm.narration} onChange={(e) => setPaymentForm({ ...paymentForm, narration: e.target.value })} placeholder="Reference" small />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
              <ActionButton label="Cancel" onClick={() => setShowPaymentModal(false)} />
              <ActionButton label="Record Payment" variant="success" icon={CreditCard} onClick={confirmPayment} />
            </div>
          </div>
        )}
      </Modal>

      {/* Opening Balance Modal */}
      <Modal isOpen={showOpeningBalanceModal} onClose={() => setShowOpeningBalanceModal(false)} title="📊 Set Opening Balance" width="450px">
        <SelectField label="Select Party" value={openingBalanceForm.partyName} onChange={(e) => setOpeningBalanceForm({ ...openingBalanceForm, partyName: e.target.value })} options={[{ value: '', label: 'Choose a party...' }, ...parties.map(p => ({ value: p, label: p }))]} small />
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
          <InputField label="Amount" type="number" value={openingBalanceForm.amount} onChange={(e) => setOpeningBalanceForm({ ...openingBalanceForm, amount: e.target.value })} small />
          <SelectField label="Type" value={openingBalanceForm.type} onChange={(e) => setOpeningBalanceForm({ ...openingBalanceForm, type: e.target.value })} options={[{ value: 'Dr', label: 'Debit' }, { value: 'Cr', label: 'Credit' }]} small />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
          <ActionButton label="Cancel" onClick={() => setShowOpeningBalanceModal(false)} />
          <ActionButton label="Save" variant="brand" onClick={() => { if (openingBalanceForm.partyName && openingBalanceForm.amount) { setOpeningBalances(prev => ({ ...prev, [openingBalanceForm.partyName]: openingBalanceForm.type === 'Dr' ? parseFloat(openingBalanceForm.amount) : -parseFloat(openingBalanceForm.amount) })); setShowOpeningBalanceModal(false); setOpeningBalanceForm({ partyName: '', amount: '', type: 'Dr' }); } }} />
        </div>
      </Modal>

      {/* Receipt Modal */}
      <Modal isOpen={showReceiptModal} onClose={() => { setShowReceiptModal(false); setReceiptForm({ amount: '', tds: '', discount: '', narration: '', paymentAdvisory: null, date: new Date().toISOString().split('T')[0], mode: 'Bank' }); }} title="🧾 Create Receipt" width="550px">
        {selectedRow && (
          <div>
            <div style={{ backgroundColor: '#EFF6FF', padding: '14px', borderRadius: '10px', marginBottom: '16px' }}>
              <div style={{ fontSize: '14px', marginBottom: '4px' }}><strong>Invoice:</strong> {selectedRow.invoiceNo}</div>
              <div style={{ fontSize: '14px', marginBottom: '4px' }}><strong>Party:</strong> {selectedRow.partyName}</div>
              <div style={{ fontSize: '14px' }}><strong>Invoice Amount:</strong> {formatCurrency(selectedRow.invoiceTotalAmount)}</div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <InputField label="Receipt Date" type="date" value={receiptForm.date} onChange={(e) => setReceiptForm({ ...receiptForm, date: e.target.value })} small />
              <SelectField label="Payment Mode" value={receiptForm.mode} onChange={(e) => setReceiptForm({ ...receiptForm, mode: e.target.value })} options={[{ value: 'Bank', label: 'Bank Transfer' }, { value: 'Cash', label: 'Cash' }, { value: 'Cheque', label: 'Cheque' }, { value: 'UPI', label: 'UPI' }]} small />
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <InputField label="Amount Received" type="number" value={receiptForm.amount} onChange={(e) => setReceiptForm({ ...receiptForm, amount: e.target.value })} placeholder="0.00" small />
              <InputField label="TDS Deducted" type="number" value={receiptForm.tds} onChange={(e) => setReceiptForm({ ...receiptForm, tds: e.target.value })} placeholder="0.00" small />
              <InputField label="Discount" type="number" value={receiptForm.discount} onChange={(e) => setReceiptForm({ ...receiptForm, discount: e.target.value })} placeholder="0.00" small />
            </div>
            
            <div style={{ backgroundColor: '#F0FDF4', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>
              <div style={{ fontSize: '14px', fontWeight: '700', color: '#166534' }}>
                Total Credit: {formatCurrency((parseFloat(receiptForm.amount) || 0) + (parseFloat(receiptForm.tds) || 0) + (parseFloat(receiptForm.discount) || 0))}
              </div>
            </div>
            
            <InputField 
              label="Narration" 
              value={receiptForm.narration} 
              onChange={(e) => setReceiptForm({ ...receiptForm, narration: e.target.value })} 
              placeholder="Payment reference, remarks..." 
              small 
            />
            
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>Payment Advisory (Optional)</label>
              <input 
                type="file" 
                ref={paymentAdvisoryRef}
                accept="image/*,.pdf"
                onChange={handlePaymentAdvisoryUpload}
                style={{ display: 'none' }}
              />
              {receiptForm.paymentAdvisory ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ flex: 1, padding: '10px', backgroundColor: '#F0FDF4', borderRadius: '8px', fontSize: '13px', color: '#166534' }}>
                    ✅ Payment advisory attached
                  </div>
                  <button onClick={() => setReceiptForm(prev => ({ ...prev, paymentAdvisory: null }))} style={{ padding: '8px', border: 'none', backgroundColor: '#FEE2E2', borderRadius: '6px', cursor: 'pointer', color: '#991B1B' }}>
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => paymentAdvisoryRef.current?.click()}
                  style={{ padding: '10px 16px', border: '1.5px dashed #D1D5DB', borderRadius: '8px', backgroundColor: '#F9FAFB', cursor: 'pointer', fontSize: '13px', color: '#6B7280', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <Upload size={16} /> Attach Payment Advisory
                </button>
              )}
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <ActionButton label="Cancel" onClick={() => setShowReceiptModal(false)} />
              <ActionButton label="Create Receipt" variant="success" icon={Receipt} onClick={handleReceiptSubmit} />
            </div>
          </div>
        )}
      </Modal>

      {/* Credit Note Modal */}
      <Modal isOpen={showCreditNoteModal} onClose={() => { setShowCreditNoteModal(false); setCreditNoteForm({ amount: '', reason: '', date: new Date().toISOString().split('T')[0] }); }} title="📝 Create Credit Note" width="500px">
        {selectedRow && (
          <div>
            <div style={{ backgroundColor: '#EFF6FF', padding: '14px', borderRadius: '10px', marginBottom: '16px' }}>
              <div style={{ fontSize: '14px', marginBottom: '4px' }}><strong>Invoice:</strong> {selectedRow.invoiceNo}</div>
              <div style={{ fontSize: '14px', marginBottom: '4px' }}><strong>Party:</strong> {selectedRow.partyName}</div>
              <div style={{ fontSize: '14px' }}><strong>Invoice Amount:</strong> {formatCurrency(selectedRow.invoiceTotalAmount)}</div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <InputField label="Credit Note Date" type="date" value={creditNoteForm.date} onChange={(e) => setCreditNoteForm({ ...creditNoteForm, date: e.target.value })} small />
              <InputField label="Credit Amount" type="number" value={creditNoteForm.amount} onChange={(e) => setCreditNoteForm({ ...creditNoteForm, amount: e.target.value })} placeholder="0.00" small />
            </div>
            
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>Reason for Credit Note *</label>
              <textarea
                value={creditNoteForm.reason}
                onChange={(e) => setCreditNoteForm({ ...creditNoteForm, reason: e.target.value })}
                placeholder="Enter reason for issuing credit note..."
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1.5px solid #D1D5DB', fontSize: '13px', minHeight: '80px', resize: 'vertical', boxSizing: 'border-box' }}
              />
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <ActionButton label="Cancel" onClick={() => setShowCreditNoteModal(false)} />
              <ActionButton label="Create Credit Note" variant="primary" icon={FileText} onClick={handleCreditNoteSubmit} />
            </div>
          </div>
        )}
      </Modal>

      {/* Clear Data Confirmation Modal */}
      <Modal isOpen={showClearDataModal} onClose={() => setShowClearDataModal(false)} title="🗑️ Clear All Data" width="500px">
        <div>
          <div style={{ backgroundColor: '#FEE2E2', padding: '20px', borderRadius: '12px', marginBottom: '20px', border: '2px solid #FCA5A5' }}>
            <div style={{ fontWeight: '700', color: '#991B1B', fontSize: '18px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={24} /> Warning: This action cannot be undone!
            </div>
            <div style={{ fontSize: '14px', color: '#7F1D1D', lineHeight: '1.6' }}>
              This will permanently delete:
              <ul style={{ margin: '12px 0 0 20px', padding: 0 }}>
                <li><strong>{masterData.length}</strong> campaigns from Master Sheet</li>
                <li><strong>{masterData.filter(r => r.invoiceGenerated).length}</strong> generated invoices</li>
                <li><strong>{receipts.length}</strong> receipts</li>
                <li><strong>{creditNotes.length}</strong> credit notes</li>
                <li><strong>{ledgerEntries.length}</strong> ledger entries</li>
                <li><strong>{Object.keys(mailerImages).length}</strong> mailer images</li>
                <li>All opening balances</li>
              </ul>
            </div>
          </div>
          
          <div style={{ backgroundColor: '#FEF3C7', padding: '14px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #FCD34D' }}>
            <div style={{ fontSize: '13px', color: '#92400E' }}>
              <strong>Note:</strong> Invoice series numbers will be reset to 1. Your company settings and mailer logo will be preserved.
            </div>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <ActionButton label="Cancel" onClick={() => setShowClearDataModal(false)} />
            <ActionButton label="Yes, Clear All Data" variant="danger" icon={Trash2} onClick={clearMasterData} />
          </div>
        </div>
      </Modal>
    </>
  );

  // ============================================
  // MAIN RENDER
  // ============================================
  
  const renderContent = () => {
    switch (activeMenu) {
      case 'master': return renderMasterSheet();
      case 'invoices': return renderInvoices();
      case 'ledgers': return renderLedgers();
      case 'reports': return renderReports();
      case 'settings': return userRole === 'finance' ? renderSettings() : renderReports();
      default: return renderMasterSheet();
    }
  };

  // Login Screen
  const renderLoginScreen = () => (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F1F5F9', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      <div style={{ backgroundColor: '#FFFFFF', padding: '40px', borderRadius: '16px', boxShadow: '0 10px 40px rgba(0,0,0,0.1)', width: '400px', maxWidth: '95vw' }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <div style={{ width: '70px', height: '70px', borderRadius: '50%', background: 'linear-gradient(135deg, #2874A6, #1a5276)', color: 'white', fontSize: '28px', fontWeight: 'bold', fontStyle: 'italic', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>im</div>
          <h1 style={{ margin: 0, fontSize: '22px', fontWeight: '700', color: '#1E293B' }}>INDREESH MEDIA LLP</h1>
          <p style={{ margin: '8px 0 0', color: '#64748B', fontSize: '14px' }}>Finance Management System</p>
        </div>
        
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>Username</label>
          <input
            type="text"
            value={loginForm.username}
            onChange={(e) => setLoginForm(prev => ({ ...prev, username: e.target.value }))}
            placeholder="Enter username"
            style={{ width: '100%', padding: '12px 14px', borderRadius: '8px', border: '1.5px solid #D1D5DB', fontSize: '14px', boxSizing: 'border-box' }}
          />
        </div>
        
        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>Password</label>
          <input
            type="password"
            value={loginForm.password}
            onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
            placeholder="Enter password"
            onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
            style={{ width: '100%', padding: '12px 14px', borderRadius: '8px', border: '1.5px solid #D1D5DB', fontSize: '14px', boxSizing: 'border-box' }}
          />
        </div>
        
        {loginError && (
          <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#FEE2E2', borderRadius: '8px', color: '#991B1B', fontSize: '13px', textAlign: 'center' }}>
            {loginError}
          </div>
        )}
        
        <button
          onClick={handleLogin}
          style={{ width: '100%', padding: '14px', fontSize: '15px', fontWeight: '600', border: 'none', borderRadius: '10px', cursor: 'pointer', backgroundColor: '#2874A6', color: 'white' }}
        >
          Login
        </button>
        
        <div style={{ marginTop: '24px', padding: '16px', backgroundColor: '#F8FAFC', borderRadius: '10px', fontSize: '12px', color: '#64748B' }}>
          <div style={{ fontWeight: '600', marginBottom: '8px', color: '#475569' }}>Demo Credentials:</div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div><strong>Finance:</strong> finance / finance123</div>
            <div><strong>Director:</strong> director / director123</div>
          </div>
        </div>
      </div>
    </div>
  );

  // If not logged in, show login screen
  if (!isLoggedIn) {
    return renderLoginScreen();
  }

  // Show loading screen while fetching data
  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F1F5F9', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
        <div style={{ textAlign: 'center' }}>
          <Loader2 size={48} style={{ animation: 'spin 1s linear infinite', color: '#2874A6', marginBottom: '16px' }} />
          <div style={{ fontSize: '18px', fontWeight: '600', color: '#1E293B' }}>Loading your data...</div>
          <div style={{ fontSize: '14px', color: '#64748B', marginTop: '8px' }}>Please wait while we sync with the cloud</div>
        </div>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', height: '100vh', backgroundColor: '#F1F5F9', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      {renderSidebar()}
      <main style={{ flex: 1, overflow: 'auto', padding: '20px' }}>{renderContent()}</main>
      {renderModals()}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
