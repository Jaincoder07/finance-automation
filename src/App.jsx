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
  MessageSquare, ThumbsUp, Edit3, Loader2, Bell, BellRing, Phone, Lock
} from 'lucide-react';
import { saveAppState, loadAppState, subscribeToAppState } from './firebase';

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
  // Login State - Check localStorage for persistence
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    const saved = localStorage.getItem('financeAppLogin');
    return saved ? JSON.parse(saved).isLoggedIn : false;
  });
  const [userRole, setUserRole] = useState(() => {
    const saved = localStorage.getItem('financeAppLogin');
    return saved ? JSON.parse(saved).userRole : null;
  });
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  
  // User credentials - passwords can be changed by users
  const [userPasswords, setUserPasswords] = useState({
    finance: 'finance123',
    director: 'director123'
  });
  const [passwordsLoaded, setPasswordsLoaded] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [passwordError, setPasswordError] = useState('');

  const users = {
    finance: { role: 'finance', name: 'Finance Team' },
    director: { role: 'director', name: 'Director' }
  };

  // Load passwords from Firebase on app start (before login)
  useEffect(() => {
    const loadPasswordsFromFirebase = async () => {
      try {
        const data = await loadAppState('indreesh-media');
        if (data && data.userPasswords) {
          setUserPasswords(data.userPasswords);
          console.log('Passwords loaded from Firebase');
        }
      } catch (error) {
        console.error('Error loading passwords:', error);
      }
      setPasswordsLoaded(true);
    };
    loadPasswordsFromFirebase();
  }, []);

  const [companyConfig, setCompanyConfig] = useState({
    name: 'Indreesh Media LLP',
    brand: 'JAC',
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
      holder: 'Indreesh Media LLP'
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
  
  // Ledger Period & Search
  const [ledgerPeriod, setLedgerPeriod] = useState({
    fromDate: '2020-01-01',
    toDate: new Date().toISOString().split('T')[0]
  });
  const [ledgerPartySearch, setLedgerPartySearch] = useState('');
  
  // Master Sheet Tabs
  const [masterSheetTab, setMasterSheetTab] = useState('open'); // 'open' or 'closed'
  
  // Invoice Register Filters
  const [invoiceFilters, setInvoiceFilters] = useState({
    party: '', invoiceStatus: '', receiptStatus: '', invoiceType: '', searchText: ''
  });
  
  // Notifications
  const [notifications, setNotifications] = useState([]);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  
  // Followups for debtors
  const [followups, setFollowups] = useState([]);
  const [showFollowupModal, setShowFollowupModal] = useState(false);
  const [selectedInvoiceForFollowup, setSelectedInvoiceForFollowup] = useState(null);
  const [followupForm, setFollowupForm] = useState({
    date: new Date().toISOString().split('T')[0],
    notes: '',
    nextFollowupDate: '',
    status: 'Pending'
  });
  
  // WhatsApp Notification Settings (using CallMeBot - FREE)
  const [whatsappSettings, setWhatsappSettings] = useState({
    enabled: false,
    financePhone: '',
    financeApiKey: '',
    directorPhone: '',
    directorApiKey: ''
  });
  
  const [receiptForm, setReceiptForm] = useState({
    amount: '', tds: '', discount: '', narration: '', paymentAdvisory: null,
    date: new Date().toISOString().split('T')[0], mode: 'Bank'
  });
  
  const [creditNoteForm, setCreditNoteForm] = useState({
    amount: '', gst: '', reason: '', date: new Date().toISOString().split('T')[0]
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
  
  // Party Master Data (with GSTIN, State, etc.)
  const [partyMaster, setPartyMaster] = useState({});
  
  // Historical Ledger Upload
  const [showHistoricalLedgerModal, setShowHistoricalLedgerModal] = useState(false);
  
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
  const partyMasterInputRef = useRef(null);
  const historicalLedgerInputRef = useRef(null);

  // ============================================
  // SAFE ARRAY ACCESSORS (ensure arrays are always arrays)
  // ============================================
  const safeMasterData = useMemo(() => Array.isArray(masterData) ? masterData : [], [masterData]);
  const safeLedgerEntries = useMemo(() => Array.isArray(ledgerEntries) ? ledgerEntries : [], [ledgerEntries]);
  const safeReceipts = useMemo(() => Array.isArray(receipts) ? receipts : [], [receipts]);
  const safeCreditNotes = useMemo(() => Array.isArray(creditNotes) ? creditNotes : [], [creditNotes]);
  const safeNotifications = useMemo(() => Array.isArray(notifications) ? notifications : [], [notifications]);
  const safeFollowups = useMemo(() => Array.isArray(followups) ? followups : [], [followups]);
  const safePartyMaster = useMemo(() => (partyMaster && typeof partyMaster === 'object' && !Array.isArray(partyMaster)) ? partyMaster : {}, [partyMaster]);
  const safeOpeningBalances = useMemo(() => (openingBalances && typeof openingBalances === 'object' && !Array.isArray(openingBalances)) ? openingBalances : {}, [openingBalances]);

  // ============================================
  // STATE NORMALIZATION HELPER (for GST matching)
  // ============================================
  const normalizeStateName = useCallback((state) => {
    if (!state) return '';
    const s = state.toUpperCase().trim();
    
    // Common variations mapping
    if (s.includes('MAHARASHTRA') || s === 'MH') return 'MAHARASHTRA';
    if (s.includes('DELHI') || s === 'DL' || s.includes('NEW DELHI')) return 'DELHI';
    if (s.includes('KARNATAKA') || s === 'KA' || s.includes('BANGALORE') || s.includes('BENGALURU')) return 'KARNATAKA';
    if (s.includes('TAMIL') || s === 'TN' || s.includes('CHENNAI')) return 'TAMIL NADU';
    if (s.includes('TELANGANA') || s === 'TG' || s === 'TS' || s.includes('HYDERABAD')) return 'TELANGANA';
    if (s.includes('UTTAR PRADESH') || s === 'UP' || s.includes('NOIDA') || s.includes('LUCKNOW')) return 'UTTAR PRADESH';
    if (s.includes('WEST BENGAL') || s === 'WB' || s.includes('KOLKATA')) return 'WEST BENGAL';
    if (s.includes('GUJARAT') || s === 'GJ' || s.includes('AHMEDABAD')) return 'GUJARAT';
    if (s.includes('RAJASTHAN') || s === 'RJ' || s.includes('JAIPUR')) return 'RAJASTHAN';
    if (s.includes('PUNJAB') || s === 'PB') return 'PUNJAB';
    if (s.includes('HARYANA') || s === 'HR' || s.includes('GURGAON') || s.includes('GURUGRAM')) return 'HARYANA';
    if (s.includes('MADHYA PRADESH') || s === 'MP' || s.includes('BHOPAL')) return 'MADHYA PRADESH';
    if (s.includes('ANDHRA') || s === 'AP') return 'ANDHRA PRADESH';
    if (s.includes('KERALA') || s === 'KL') return 'KERALA';
    if (s.includes('ODISHA') || s.includes('ORISSA') || s === 'OR' || s === 'OD') return 'ODISHA';
    if (s.includes('BIHAR') || s === 'BR') return 'BIHAR';
    if (s.includes('JHARKHAND') || s === 'JH') return 'JHARKHAND';
    if (s.includes('ASSAM') || s === 'AS') return 'ASSAM';
    if (s.includes('CHHATTISGARH') || s === 'CG') return 'CHHATTISGARH';
    if (s.includes('GOA') || s === 'GA') return 'GOA';
    if (s.includes('HIMACHAL') || s === 'HP') return 'HIMACHAL PRADESH';
    if (s.includes('JAMMU') || s === 'JK') return 'JAMMU AND KASHMIR';
    if (s.includes('UTTARAKHAND') || s.includes('UTTARANCHAL') || s === 'UK') return 'UTTARAKHAND';
    if (s.includes('MUMBAI')) return 'MAHARASHTRA';
    if (s.includes('CHANDIGARH')) return 'CHANDIGARH';
    
    return s;
  }, []);

  // Get party GSTIN by matching party name and state
  const getPartyGstin = useCallback((partyName, stateDetails) => {
    if (!partyName) return '';
    const normalizedState = normalizeStateName(stateDetails);
    
    // Try composite key first
    const compositeKey = `${partyName.trim()}|${normalizedState}`;
    if (safePartyMaster[compositeKey]?.gstin) {
      return safePartyMaster[compositeKey].gstin;
    }
    
    // Fallback: search through all entries for matching party name and state
    for (const key in safePartyMaster) {
      const entry = safePartyMaster[key];
      if (entry.partyName === partyName.trim() && entry.normalizedState === normalizedState) {
        return entry.gstin || '';
      }
    }
    
    // Last fallback: try old format (just party name as key)
    if (safePartyMaster[partyName.trim()]?.gstin) {
      return safePartyMaster[partyName.trim()].gstin;
    }
    
    return '';
  }, [safePartyMaster, normalizeStateName]);

  // ============================================
  // FIREBASE DATA PERSISTENCE
  // ============================================
  
  // Ref to track if update is from server (to avoid save loop)
  const isReceivingUpdateRef = useRef(false);
  const unsubscribeRef = useRef(null);
  
  // Load data from Firebase on login
  const loadDataFromFirebase = async () => {
    setIsLoading(true);
    try {
      const data = await loadAppState('indreesh-media');
      if (data) {
        // Arrays - ensure they're actually arrays
        if (Array.isArray(data.masterData)) setMasterData(data.masterData);
        if (Array.isArray(data.ledgerEntries)) setLedgerEntries(data.ledgerEntries);
        if (Array.isArray(data.receipts)) setReceipts(data.receipts);
        if (Array.isArray(data.creditNotes)) setCreditNotes(data.creditNotes);
        if (Array.isArray(data.notifications)) setNotifications(data.notifications);
        if (Array.isArray(data.followups)) setFollowups(data.followups);
        
        // Objects - ensure they're actually objects
        if (data.openingBalances && typeof data.openingBalances === 'object' && !Array.isArray(data.openingBalances)) setOpeningBalances(data.openingBalances);
        if (data.mailerImages && typeof data.mailerImages === 'object' && !Array.isArray(data.mailerImages)) setMailerImages(data.mailerImages);
        if (data.partyMaster && typeof data.partyMaster === 'object' && !Array.isArray(data.partyMaster)) setPartyMaster(data.partyMaster);
        if (data.userPasswords && typeof data.userPasswords === 'object' && !Array.isArray(data.userPasswords)) setUserPasswords(data.userPasswords);
        
        // Other types
        if (data.mailerLogo) setMailerLogo(data.mailerLogo);
        if (data.companyConfig) setCompanyConfig(prev => ({ 
          ...prev, 
          ...data.companyConfig,
          // Always use hardcoded company name and bank holder (not from Firebase)
          name: 'Indreesh Media LLP',
          bank: { ...(data.companyConfig.bank || prev.bank), holder: 'Indreesh Media LLP' }
        }));
        if (data.nextInvoiceNo) setNextInvoiceNo(data.nextInvoiceNo);
        if (data.nextCombineNo) setNextCombineNo(data.nextCombineNo);
        if (data.nextReceiptNo) setNextReceiptNo(data.nextReceiptNo);
        if (data.nextCreditNoteNo) setNextCreditNoteNo(data.nextCreditNoteNo);
        if (data.invoiceValues) setInvoiceValues(data.invoiceValues);
        if (data.whatsappSettings) setWhatsappSettings(prev => ({ ...prev, ...data.whatsappSettings }));
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
        invoiceValues,
        notifications,
        whatsappSettings,
        partyMaster,
        followups,
        userPasswords
      });
      setLastSaved(new Date());
      console.log('Data saved to Firebase');
    } catch (error) {
      console.error('Error saving data:', error);
    }
    setIsSaving(false);
  }, [masterData, ledgerEntries, receipts, creditNotes, openingBalances, mailerImages, mailerLogo, companyConfig, nextInvoiceNo, nextCombineNo, nextReceiptNo, nextCreditNoteNo, invoiceValues, notifications, whatsappSettings, partyMaster, followups, userPasswords]);

  // Auto-save when data changes (debounced 1 second for faster sync)
  useEffect(() => {
    if (!isLoggedIn) return;
    
    // Skip save if we're receiving an update from Firebase (to avoid loop)
    if (isReceivingUpdateRef.current) return;
    
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = setTimeout(() => {
      // Double-check we're not in a receiving state
      if (!isReceivingUpdateRef.current) {
        saveDataToFirebase();
      }
    }, 1000);
    
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [masterData, ledgerEntries, receipts, creditNotes, openingBalances, mailerImages, mailerLogo, companyConfig, nextInvoiceNo, nextCombineNo, nextReceiptNo, nextCreditNoteNo, invoiceValues, notifications, whatsappSettings, partyMaster, followups, userPasswords, isLoggedIn]);

  // ============================================
  // NOTIFICATION SYSTEM
  // ============================================
  
  // Send WhatsApp notification using CallMeBot API (FREE)
  const sendWhatsAppNotification = async (type, message, forRole) => {
    // Check if WhatsApp notifications are enabled
    if (!whatsappSettings.enabled) {
      console.log('WhatsApp notifications not enabled');
      return;
    }
    
    // Determine recipient based on forRole
    if (forRole === 'finance' && whatsappSettings.financePhone && whatsappSettings.financeApiKey) {
      sendSingleWhatsApp(whatsappSettings.financePhone, whatsappSettings.financeApiKey, type, message);
    } else if (forRole === 'director' && whatsappSettings.directorPhone && whatsappSettings.directorApiKey) {
      sendSingleWhatsApp(whatsappSettings.directorPhone, whatsappSettings.directorApiKey, type, message);
    } else if (forRole === 'all') {
      // Send to both if configured
      if (whatsappSettings.financePhone && whatsappSettings.financeApiKey) {
        sendSingleWhatsApp(whatsappSettings.financePhone, whatsappSettings.financeApiKey, type, message);
      }
      if (whatsappSettings.directorPhone && whatsappSettings.directorApiKey) {
        sendSingleWhatsApp(whatsappSettings.directorPhone, whatsappSettings.directorApiKey, type, message);
      }
    }
  };
  
  const sendSingleWhatsApp = async (phone, apiKey, type, message) => {
    try {
      const typeLabels = {
        'upload': '📊 DATA UPLOAD',
        'invoice': '🧾 INVOICE',
        'approval': '✅ APPROVED',
        'edit': '✏️ EDIT REQUIRED',
        'receipt': '💰 PAYMENT',
        'info': '📌 UPDATE'
      };
      
      const fullMessage = `*${typeLabels[type] || '📌 NOTIFICATION'}*\n\n${message}\n\n_${companyConfig.name}_\n_${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}_`;
      
      // CallMeBot API - completely FREE
      const url = `https://api.callmebot.com/whatsapp.php?phone=${phone}&text=${encodeURIComponent(fullMessage)}&apikey=${apiKey}`;
      
      // Use fetch with no-cors mode (CallMeBot doesn't support CORS but still works)
      fetch(url, { mode: 'no-cors' })
        .then(() => console.log('WhatsApp notification sent to:', phone))
        .catch(err => console.log('WhatsApp send attempted:', phone));
        
    } catch (error) {
      console.error('Failed to send WhatsApp notification:', error);
    }
  };
  
  // Test WhatsApp connection
  const testWhatsAppNotification = (phone, apiKey) => {
    if (!phone || !apiKey) {
      alert('Please enter phone number and API key first');
      return;
    }
    sendSingleWhatsApp(phone, apiKey, 'info', 'Test notification from Indreesh Media LLP. WhatsApp notifications are working!');
    alert('Test message sent! Check your WhatsApp.');
  };
  
  const addNotification = (type, message, forRole = 'all') => {
    const newNotification = {
      id: Date.now() + Math.random(),
      type, // 'upload', 'invoice', 'approval', 'receipt', 'edit', 'info'
      message,
      forRole, // 'finance', 'director', 'all'
      createdAt: new Date().toISOString(),
      createdBy: userRole,
      read: { finance: false, director: false }
    };
    setNotifications(prev => [newNotification, ...prev].slice(0, 50)); // Keep last 50 notifications
    
    // Send WhatsApp notification
    sendWhatsAppNotification(type, message, forRole);
  };

  const markNotificationAsRead = (notificationId) => {
    setNotifications(prev => {
      const safePrev = Array.isArray(prev) ? prev : [];
      return safePrev.map(n => {
        if (n.id === notificationId) {
          return { ...n, read: { ...n.read, [userRole]: true } };
        }
        return n;
      });
    });
  };

  const markAllNotificationsAsRead = () => {
    setNotifications(prev => {
      const safePrev = Array.isArray(prev) ? prev : [];
      return safePrev.map(n => ({
        ...n, read: { ...n.read, [userRole]: true }
      }));
    });
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  // Get notifications for current user role
  const userNotifications = useMemo(() => {
    return safeNotifications.filter(n => 
      n.forRole === 'all' || n.forRole === userRole || n.createdBy !== userRole
    ).map(n => ({
      ...n,
      read: n.read || { finance: false, director: false }
    }));
  }, [safeNotifications, userRole]);

  const unreadCount = useMemo(() => {
    if (!userRole) return 0;
    return userNotifications.filter(n => !(n.read && n.read[userRole])).length;
  }, [userNotifications, userRole]);

  // ============================================
  // LOGIN HANDLING
  // ============================================
  
  const handleLogin = async () => {
    const user = users[loginForm.username.toLowerCase()];
    const password = userPasswords[loginForm.username.toLowerCase()];
    if (user && password === loginForm.password) {
      setIsLoggedIn(true);
      setUserRole(user.role);
      // Save to localStorage for persistence
      localStorage.setItem('financeAppLogin', JSON.stringify({ isLoggedIn: true, userRole: user.role }));
      setLoginError('');
      setLoginForm({ username: '', password: '' });
      await loadDataFromFirebase();
    } else {
      setLoginError('Invalid username or password');
    }
  };

  const handlePasswordChange = async () => {
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      setPasswordError('Please fill all fields');
      return;
    }
    
    const currentUser = userRole === 'director' ? 'director' : 'finance';
    if (userPasswords[currentUser] !== passwordForm.currentPassword) {
      setPasswordError('Current password is incorrect');
      return;
    }
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }
    
    if (passwordForm.newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      return;
    }
    
    // Update password in state
    const newPasswords = { ...userPasswords, [currentUser]: passwordForm.newPassword };
    setUserPasswords(newPasswords);
    
    // Explicitly save to Firebase immediately (don't rely on auto-save)
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
        invoiceValues,
        notifications,
        whatsappSettings,
        partyMaster,
        followups,
        userPasswords: newPasswords
      });
      console.log('Password saved to Firebase');
    } catch (error) {
      console.error('Error saving password:', error);
      setPasswordError('Failed to save password. Please try again.');
      return;
    }
    
    setShowPasswordModal(false);
    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setPasswordError('');
    alert('✅ Password changed successfully!');
  };

  const handleLogout = () => {
    saveDataToFirebase();
    setIsLoggedIn(false);
    setUserRole(null);
    setActiveMenu('master');
    // Clear localStorage
    localStorage.removeItem('financeAppLogin');
  };

  // Auto-load data if already logged in from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('financeAppLogin');
    if (saved) {
      const { isLoggedIn: wasLoggedIn } = JSON.parse(saved);
      if (wasLoggedIn) {
        loadDataFromFirebase();
      }
    }
  }, []);
  
  // Real-time sync listener - updates data when changes happen in Firebase
  useEffect(() => {
    if (!isLoggedIn) {
      // Cleanup subscription on logout
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      return;
    }
    
    // Set up real-time listener
    unsubscribeRef.current = subscribeToAppState('indreesh-media', (data) => {
      if (!data) return;
      
      // Mark that we're receiving an update to avoid save loop
      isReceivingUpdateRef.current = true;
      
      // Arrays - ensure they're actually arrays
      if (Array.isArray(data.masterData)) setMasterData(data.masterData);
      if (Array.isArray(data.ledgerEntries)) setLedgerEntries(data.ledgerEntries);
      if (Array.isArray(data.receipts)) setReceipts(data.receipts);
      if (Array.isArray(data.creditNotes)) setCreditNotes(data.creditNotes);
      if (Array.isArray(data.notifications)) setNotifications(data.notifications);
      if (Array.isArray(data.followups)) setFollowups(data.followups);
      
      // Objects - ensure they're actually objects
      if (data.openingBalances && typeof data.openingBalances === 'object' && !Array.isArray(data.openingBalances)) setOpeningBalances(data.openingBalances);
      if (data.mailerImages && typeof data.mailerImages === 'object' && !Array.isArray(data.mailerImages)) setMailerImages(data.mailerImages);
      if (data.partyMaster && typeof data.partyMaster === 'object' && !Array.isArray(data.partyMaster)) setPartyMaster(data.partyMaster);
      if (data.userPasswords && typeof data.userPasswords === 'object' && !Array.isArray(data.userPasswords)) setUserPasswords(data.userPasswords);
      
      // Other types
      if (data.mailerLogo) setMailerLogo(data.mailerLogo);
      if (data.companyConfig) setCompanyConfig(prev => ({ 
        ...prev, 
        ...data.companyConfig,
        // Always use hardcoded company name and bank holder (not from Firebase)
        name: 'Indreesh Media LLP',
        bank: { ...(data.companyConfig.bank || prev.bank), holder: 'Indreesh Media LLP' }
      }));
      if (data.nextInvoiceNo) setNextInvoiceNo(data.nextInvoiceNo);
      if (data.nextCombineNo) setNextCombineNo(data.nextCombineNo);
      if (data.nextReceiptNo) setNextReceiptNo(data.nextReceiptNo);
      if (data.nextCreditNoteNo) setNextCreditNoteNo(data.nextCreditNoteNo);
      if (data.invoiceValues) setInvoiceValues(data.invoiceValues);
      if (data.whatsappSettings) setWhatsappSettings(prev => ({ ...prev, ...data.whatsappSettings }));
      
      // Reset flag after a short delay
      setTimeout(() => {
        isReceivingUpdateRef.current = false;
      }, 500);
      
      console.log('Real-time sync: Data updated from Firebase');
    });
    
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [isLoggedIn]);

  const canEdit = userRole === 'finance';
  const isDirector = userRole === 'director';
  // ============================================
  // COMPUTED VALUES
  // ============================================
  
  // All unique party names (for dropdowns that just need names)
  const parties = useMemo(() => {
    const partySet = new Set();
    
    // From masterData
    safeMasterData.forEach(r => {
      if (r.partyName) partySet.add(r.partyName);
    });
    
    // From partyMaster - extract party names from entries
    Object.values(safePartyMaster).forEach(entry => {
      if (entry.partyName) partySet.add(entry.partyName);
    });
    
    // From ledgerEntries
    safeLedgerEntries.forEach(e => {
      if (e.partyName) partySet.add(e.partyName);
    });
    
    // From openingBalances
    Object.keys(safeOpeningBalances).forEach(name => {
      if (name) partySet.add(name);
    });
    
    return Array.from(partySet).filter(Boolean).sort();
  }, [safeMasterData, safePartyMaster, safeLedgerEntries, safeOpeningBalances]);

  // Parties with state info for ledger - includes ALL from Party Master
  const partiesForLedger = useMemo(() => {
    const partyList = [];
    const addedKeys = new Set();
    
    // FIRST: Add ALL entries from Party Master (this is the primary source)
    Object.entries(safePartyMaster).forEach(([key, entry]) => {
      if (entry.partyName) {
        const partyKey = `${entry.partyName}|${entry.normalizedState || normalizeStateName(entry.stateName)}`;
        if (!addedKeys.has(partyKey)) {
          addedKeys.add(partyKey);
          partyList.push({
            partyName: entry.partyName,
            state: entry.stateName || '',
            normalizedState: entry.normalizedState || normalizeStateName(entry.stateName),
            gstin: entry.gstin || '',
            fromPartyMaster: true
          });
        }
      }
    });
    
    // SECOND: Add from masterData (if not already added from Party Master)
    safeMasterData.forEach(r => {
      if (r.partyName) {
        const normalizedState = normalizeStateName(r.statePartyDetails);
        const partyKey = `${r.partyName}|${normalizedState}`;
        if (!addedKeys.has(partyKey)) {
          addedKeys.add(partyKey);
          // Try to find GSTIN from party master
          const gstin = getPartyGstin(r.partyName, r.statePartyDetails);
          partyList.push({
            partyName: r.partyName,
            state: r.statePartyDetails || '',
            normalizedState: normalizedState,
            gstin: gstin,
            fromPartyMaster: false
          });
        }
      }
    });
    
    // THIRD: Add from ledgerEntries
    safeLedgerEntries.forEach(e => {
      if (e.partyName) {
        const normalizedState = normalizeStateName(e.state || e.statePartyDetails || '');
        const partyKey = `${e.partyName}|${normalizedState}`;
        if (!addedKeys.has(partyKey)) {
          addedKeys.add(partyKey);
          const gstin = getPartyGstin(e.partyName, e.state || e.statePartyDetails);
          partyList.push({
            partyName: e.partyName,
            state: e.state || e.statePartyDetails || '',
            normalizedState: normalizedState,
            gstin: gstin,
            fromPartyMaster: false
          });
        }
      }
    });
    
    // FOURTH: Add from opening balances (if not already present)
    Object.keys(safeOpeningBalances).forEach(partyName => {
      if (partyName && !Array.from(addedKeys).some(k => k.startsWith(partyName + '|'))) {
        partyList.push({
          partyName: partyName,
          state: '',
          normalizedState: '',
          gstin: '',
          fromPartyMaster: false
        });
      }
    });
    
    return partyList.sort((a, b) => a.partyName.localeCompare(b.partyName));
  }, [safeMasterData, safePartyMaster, safeLedgerEntries, safeOpeningBalances, getPartyGstin, normalizeStateName]);

  const combinationCodes = useMemo(() => {
    const codes = [...new Set(safeMasterData.filter(r => r.combinationCode && r.combinationCode !== 'NA').map(r => r.combinationCode))];
    return codes.sort((a, b) => parseInt(a) - parseInt(b));
  }, [safeMasterData]);

  const filteredData = useMemo(() => {
    return safeMasterData.filter(row => {
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
  }, [safeMasterData, filters]);

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
    const openingBal = safeOpeningBalances[selectedParty] || 0;
    let balance = openingBal;
    const entries = safeLedgerEntries
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
  }, [selectedParty, safeLedgerEntries, safeOpeningBalances]);

  const getUnbilledCampaignsForParty = (partyName) => {
    return safeMasterData.filter(r => 
      r.partyName === partyName && 
      r.toBeBilled === 'Yes' && 
      !r.invoiceGenerated &&
      r.invoiceAmount
    );
  };

  const isCombinedMailSent = (combinationCode) => {
    if (!combinationCode || combinationCode === 'NA') return false;
    return safeMasterData.some(r => r.combinationCode === combinationCode && r.mailingSent === 'Yes');
  };

  // Get all campaigns for a combined invoice
  const getCombinedCampaigns = (row) => {
    if (row.invoiceType === 'Combined' && row.combinationCode !== 'NA') {
      return safeMasterData.filter(r => r.combinationCode === row.combinationCode);
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
    // Load existing remarks (either editComments or approvalRemarks)
    setEditComments(row.editComments || row.approvalRemarks || '');
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
      approvalRemarks: editComments.trim() || '', // Save approval remarks
      editComments: '', // Clear edit comments
      particularsApproved: true,
      emailApproved: true,
      invoiceTypeApproved: true,
      approvedBy: userRole,
      approvedDate: new Date().toISOString()
    };
    
    // Get all campaigns for this invoice
    let invoiceCampaigns = [];
    if (selectedRow.invoiceType === 'Combined' && selectedRow.combinationCode !== 'NA') {
      invoiceCampaigns = masterData.filter(r => r.combinationCode === selectedRow.combinationCode);
      setMasterData(prev => prev.map(r => 
        r.combinationCode === selectedRow.combinationCode 
          ? { ...r, ...approvalData } 
          : r
      ));
    } else {
      invoiceCampaigns = [selectedRow];
      setMasterData(prev => prev.map(r => 
        r.id === selectedRow.id 
          ? { ...r, ...approvalData } 
          : r
      ));
    }
    
    // Create ledger entry on approval with proper format
    const totalAmount = parseFloat(selectedRow.invoiceTotalAmount) || 0;
    const campaignDetails = invoiceCampaigns.map(c => c.senderName || c.campaignName?.split('--')[0]?.trim()).join(', ');
    const narration = `${selectedRow.invoiceNo} - ${campaignDetails}`;
    
    setLedgerEntries(prev => [...prev, { 
      id: Date.now(), 
      partyName: selectedRow.partyName, 
      date: selectedRow.invoiceDate, 
      particulars: 'Promotional Trade Mailer', 
      narration: narration,
      debit: totalAmount, 
      credit: 0, 
      type: 'invoice', 
      invoiceNo: selectedRow.invoiceNo,
      combinationCode: selectedRow.combinationCode
    }]);
    
    // Notify finance about approval
    const remarksNote = editComments.trim() ? ` | Remarks: "${editComments.trim()}"` : '';
    addNotification('approval', `✅ Invoice ${selectedRow.invoiceNo} has been APPROVED by Director${remarksNote} - ready for mailing`, 'finance');
    
    // Data will auto-save in 1 second
    // Auto-save will handle this
    
    setShowApprovalModal(false);
    setSelectedRow(null);
    setApprovalChecks({ particularsApproved: false, emailApproved: false, invoiceTypeApproved: false });
    setEditComments('');
    alert('✅ Invoice Approved!\n\nThe invoice is now ready for mailing.');
  };

  const handleNeedEdits = () => {
    if (!selectedRow) return;
    
    const remarksToSave = editComments.trim();
    
    if (selectedRow.invoiceType === 'Combined' && selectedRow.combinationCode !== 'NA') {
      setMasterData(prev => prev.map(r => 
        r.combinationCode === selectedRow.combinationCode 
          ? { ...r, invoiceStatus: 'Need Edits', editComments: remarksToSave, approvalRemarks: '' } 
          : r
      ));
    } else {
      setMasterData(prev => prev.map(r => 
        r.id === selectedRow.id 
          ? { ...r, invoiceStatus: 'Need Edits', editComments: remarksToSave, approvalRemarks: '' } 
          : r
      ));
    }
    
    // Notify finance about edits needed
    const remarksNote = remarksToSave ? `: "${remarksToSave}"` : '';
    addNotification('edit', `✏️ Invoice ${selectedRow.invoiceNo} marked as NEED EDITS by Director${remarksNote}`, 'finance');
    
    // Data will auto-save in 1 second
    // Auto-save will handle this
    
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
    
    // Check if invoice is approved (skip mailing check for historical invoices)
    if (selectedRow.invoiceStatus !== 'Approved') {
      alert('Receipt cannot be posted. Invoice must be approved first.');
      return;
    }
    // Skip mailing check for historical invoices
    if (!selectedRow.isHistorical && selectedRow.mailingSent !== 'Yes') {
      alert('Receipt cannot be posted. Invoice must be mailed first.');
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
    
    // Add to ledger - Payment Received as particulars with narration
    const paymentNarration = receiptForm.narration || shortNarration;
    
    if (receiptAmount > 0) {
      setLedgerEntries(prev => [...prev, {
        id: Date.now(),
        partyName: selectedRow.partyName,
        date: receiptForm.date,
        particulars: `Payment Received - ${paymentNarration}`,
        narration: `${selectedRow.invoiceNo} | ${receiptForm.mode}`,
        debit: 0,
        credit: receiptAmount,
        type: 'receipt',
        receiptNo,
        invoiceNo: selectedRow.invoiceNo,
        paymentAdvisory: receiptForm.paymentAdvisory
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
    // Check if balance becomes 0 after this receipt
    const invoiceAmount = parseFloat(selectedRow.invoiceTotalAmount) || 0;
    const existingCN = creditNotes.find(cn => cn.invoiceNo === selectedRow.invoiceNo);
    const existingCNAmount = existingCN ? Math.abs(parseFloat(existingCN.totalAmount) || 0) : 0;
    const balanceAfterReceipt = invoiceAmount - totalCredit - existingCNAmount;
    const shouldClose = balanceAfterReceipt <= 0;
    
    if (selectedRow.invoiceType === 'Combined' && selectedRow.combinationCode !== 'NA') {
      setMasterData(prev => prev.map(r => 
        r.combinationCode === selectedRow.combinationCode 
          ? { ...r, receiptStatus: shouldClose ? 'Closed' : 'Received', receiptNo, receiptDate: receiptForm.date } 
          : r
      ));
    } else if (!selectedRow.isHistorical) {
      setMasterData(prev => prev.map(r => 
        r.id === selectedRow.id 
          ? { ...r, receiptStatus: shouldClose ? 'Closed' : 'Received', receiptNo, receiptDate: receiptForm.date } 
          : r
      ));
    }
    
    setNextReceiptNo(prev => prev + 1);
    
    // Notify director about payment received
    addNotification('receipt', `💰 Payment received for ${selectedRow.partyName} - Receipt ${receiptNo} - ${formatCurrency(totalCredit)}`, 'director');
    
    // Data will auto-save in 1 second
    // Auto-save will handle this
    
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
      tds: '',
      discount: '',
      reason: '',
      date: new Date().toISOString().split('T')[0]
    });
    setShowCreditNoteModal(true);
  };

  const handleCreditNoteSubmit = () => {
    if (!selectedRow || (!creditNoteForm.amount && !creditNoteForm.gst) || !creditNoteForm.reason) {
      alert('Please enter Amount and/or GST and reason');
      return;
    }
    
    // Extract year from invoice number for CN number
    const invYearMatch = selectedRow.invoiceNo.match(/(\d{4}-\d{2})/);
    const invYear = invYearMatch ? invYearMatch[1] : `${new Date().getFullYear()}-${String(new Date().getFullYear() + 1).slice(-2)}`;
    
    // Extract invoice suffix number
    const invSuffix = selectedRow.invoiceNo.split('/').pop();
    const creditNoteNo = `CN/${invYear}/${invSuffix}`;
    
    const creditAmount = parseFloat(creditNoteForm.amount) || 0;
    const gstAmount = parseFloat(creditNoteForm.gst) || 0;
    const totalCredit = creditAmount + gstAmount;
    
    // Determine GST type based on state
    const isSameState = selectedRow.statePartyDetails?.toUpperCase().includes('MAHARASHTRA');
    const gstType = isSameState ? 'CGST/SGST' : 'IGST';
    
    const newCreditNote = {
      id: Date.now(),
      creditNoteNo,
      invoiceNo: selectedRow.invoiceNo,
      partyName: selectedRow.partyName,
      date: creditNoteForm.date,
      amount: creditAmount,
      gst: gstAmount,
      gstType: gstType,
      totalAmount: totalCredit,
      reason: creditNoteForm.reason
    };
    
    setCreditNotes(prev => [...prev, newCreditNote]);
    
    // Check if CN covers full invoice amount - mark as Cancelled
    const invoiceAmount = parseFloat(selectedRow.invoiceTotalAmount) || 0;
    const existingReceipt = receipts.find(r => r.invoiceNo === selectedRow.invoiceNo);
    const existingReceiptAmount = existingReceipt ? (parseFloat(existingReceipt.amount) + parseFloat(existingReceipt.tds || 0) + parseFloat(existingReceipt.discount || 0)) : 0;
    const isFullyCoveredByCN = totalCredit >= (invoiceAmount - existingReceiptAmount);
    
    // Update masterData to add credit note number and status if fully covered
    if (!selectedRow.isHistorical) {
      setMasterData(prev => prev.map(row => 
        row.invoiceNo === selectedRow.invoiceNo 
          ? { 
              ...row, 
              creditNoteNo: creditNoteNo,
              receiptStatus: isFullyCoveredByCN ? 'Cancelled' : row.receiptStatus
            }
          : row
      ));
    }
    
    setNextCreditNoteNo(prev => prev + 1);
    setShowCreditNoteModal(false);
    setSelectedRow(null);
    setCreditNoteForm({ amount: '', gst: '', reason: '', date: new Date().toISOString().split('T')[0] });
    
    // Data will auto-save in 1 second
    // Auto-save will handle this
    
    let alertMsg = `✅ Credit Note Created!\n\nCredit Note No: ${creditNoteNo}`;
    if (creditAmount > 0) alertMsg += `\nBase Amount: ${formatCurrency(creditAmount)}`;
    if (gstAmount > 0) alertMsg += `\n${gstType}: ${formatCurrency(gstAmount)}`;
    alertMsg += `\nTotal: ${formatCurrency(totalCredit)}`;
    if (isFullyCoveredByCN) alertMsg += `\n\n⚠️ Invoice fully covered by CN - marked as Cancelled`;
    alert(alertMsg);
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
            mailDate: '',
            editComments: '',
            receiptStatus: '',
            receiptNo: '',
            receiptDate: ''
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
            mailDate: '',
            editComments: '',
            receiptStatus: '',
            receiptNo: '',
            receiptDate: ''
          };
        }
        return r;
      }));
    }
    
    // Remove from ledger
    setLedgerEntries(prev => prev.filter(e => e.invoiceNo !== invoiceNo));
    
    // Remove any receipts associated with this invoice
    const deletedReceipts = receipts.filter(r => r.invoiceNo === invoiceNo);
    if (deletedReceipts.length > 0) {
      setReceipts(prev => prev.filter(r => r.invoiceNo !== invoiceNo));
    }
    
    setShowDeleteConfirmModal(false);
    setSelectedRow(null);
    
    const receiptMsg = deletedReceipts.length > 0 ? `\n${deletedReceipts.length} receipt(s) also deleted.` : '';
    alert(`✅ Invoice ${invoiceNo} deleted.${receiptMsg}\n\nYou can now regenerate the invoice.`);
  };

  // Delete Receipt
  const handleDeleteReceipt = (receipt) => {
    if (!confirm(`Delete Receipt ${receipt.receiptNo}?\n\nThis will also update the invoice status back to Pending.`)) return;
    
    // Remove receipt
    setReceipts(prev => prev.filter(r => r.id !== receipt.id));
    
    // Update masterData to remove receipt reference
    setMasterData(prev => prev.map(r => {
      if (r.invoiceNo === receipt.invoiceNo) {
        return {
          ...r,
          receiptStatus: '',
          receiptNo: '',
          receiptDate: ''
        };
      }
      return r;
    }));
    
    alert(`✅ Receipt ${receipt.receiptNo} deleted.`);
  };

  // Delete Credit Note
  const handleDeleteCreditNote = (cn) => {
    if (!confirm(`Delete Credit Note ${cn.creditNoteNo}?\n\nThis will remove the CN association from the invoice.`)) return;
    
    // Remove credit note
    setCreditNotes(prev => prev.filter(c => c.id !== cn.id));
    
    // Update masterData to remove CN reference
    setMasterData(prev => prev.map(r => {
      if (r.invoiceNo === cn.invoiceNo) {
        return { ...r, creditNoteNo: '' };
      }
      return r;
    }));
    
    alert(`✅ Credit Note ${cn.creditNoteNo} deleted.`);
  };

  // Delete Historical Ledger Entry
  const handleDeleteHistoricalEntry = (entry) => {
    if (!confirm(`Delete historical entry?\n\nVch No: ${entry.vchNo || 'N/A'}\nAmount: ₹${entry.debit || entry.credit}\n\nThis action cannot be undone.`)) return;
    
    setLedgerEntries(prev => prev.filter(e => e.id !== entry.id));
    alert('✅ Historical entry deleted.');
  };

  // Delete all historical entries for a party
  const handleClearHistoricalForParty = () => {
    if (!selectedParty) return;
    if (!confirm(`Delete ALL historical entries for "${selectedParty}"?\n\nThis will remove all imported historical data for this party.`)) return;
    
    const count = ledgerEntries.filter(e => e.partyName === selectedParty && e.isHistorical).length;
    setLedgerEntries(prev => prev.filter(e => !(e.partyName === selectedParty && e.isHistorical)));
    alert(`✅ ${count} historical entries deleted for ${selectedParty}.`);
  };

  // ============================================
  // FOLLOWUP HANDLING
  // ============================================
  
  const openFollowupModal = (invoice) => {
    setSelectedInvoiceForFollowup(invoice);
    setFollowupForm({
      date: new Date().toISOString().split('T')[0],
      notes: '',
      nextFollowupDate: '',
      status: 'Pending'
    });
    setShowFollowupModal(true);
  };

  const handleAddFollowup = () => {
    if (!selectedInvoiceForFollowup) return;
    
    const newFollowup = {
      id: Date.now(),
      invoiceNo: selectedInvoiceForFollowup.invoiceNo,
      partyName: selectedInvoiceForFollowup.partyName,
      invoiceDate: selectedInvoiceForFollowup.invoiceDate || selectedInvoiceForFollowup.date,
      invoiceAmount: selectedInvoiceForFollowup.invoiceTotalAmount || selectedInvoiceForFollowup.totalAmount,
      subject: selectedInvoiceForFollowup.campaigns?.[0]?.subject || selectedInvoiceForFollowup.subject || '',
      followupDate: followupForm.date,
      notes: followupForm.notes,
      nextFollowupDate: followupForm.nextFollowupDate,
      status: followupForm.status
    };
    
    setFollowups(prev => [...prev, newFollowup]);
    setShowFollowupModal(false);
    setSelectedInvoiceForFollowup(null);
    
    // Add notification
    addNotification('followup', `Followup added for ${selectedInvoiceForFollowup.invoiceNo}`, 'all');
    
    alert(`✅ Followup recorded for ${selectedInvoiceForFollowup.invoiceNo}`);
  };

  const handleDeleteFollowup = (followupId) => {
    if (!confirm('Delete this followup entry?')) return;
    setFollowups(prev => prev.filter(f => f.id !== followupId));
  };

  // Generate followup email template
  const generateFollowupEmail = (invoice) => {
    const subject = invoice.subject || invoice.campaigns?.[0]?.subject || '';
    const party = invoice.partyName;
    const invNo = invoice.invoiceNo;
    const amount = formatCurrency(invoice.invoiceTotalAmount || invoice.totalAmount || 0);
    const invDate = formatDate(invoice.invoiceDate || invoice.date);
    
    const template = `Subject: RE: ${subject} - Payment Followup for Invoice ${invNo}

Dear Sir/Madam,

Greetings from ${companyConfig.name}!

This is a gentle reminder regarding the outstanding payment for:

Invoice No: ${invNo}
Invoice Date: ${invDate}
Amount: ${amount}
Party: ${party}

We kindly request you to process the payment at the earliest. If the payment has already been made, please share the payment details for our records.

For any queries, please feel free to reach out.

Thanks & Regards,
Finance Team
${companyConfig.name}
Email: ${companyConfig.email}
Phone: ${companyConfig.phone}`;

    return template;
  };

  const copyFollowupTemplate = (invoice) => {
    const template = generateFollowupEmail(invoice);
    navigator.clipboard.writeText(template);
    alert('✅ Followup email template copied to clipboard!');
  };

  const openGmailWithFollowup = (invoice) => {
    const subject = invoice.subject || invoice.campaigns?.[0]?.subject || '';
    const searchQuery = encodeURIComponent(subject);
    // Open Gmail search to find original email
    window.open(`https://mail.google.com/mail/u/0/#search/${searchQuery}`, '_blank');
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

  // Party Master Upload Handler
  const handlePartyMasterUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const workbook = XLSX.read(event.target.result, { type: 'binary' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(sheet);
      
      const newPartyMaster = { ...partyMaster };
      let addedCount = 0;
      
      data.forEach(row => {
        const partyName = (row['Name of Ledger'] || row['Party Name'] || row['NAME OF LEDGER'] || row['PARTY NAME'] || '').trim();
        const stateName = (row['State Name'] || row['STATE NAME'] || row['State'] || row['STATE'] || '').trim();
        
        if (partyName) {
          // Create composite key: partyName|normalizedState
          const normalizedState = normalizeStateName(stateName);
          const compositeKey = `${partyName}|${normalizedState}`;
          
          newPartyMaster[compositeKey] = {
            partyName: partyName,
            ledgerGroup: row['Ledger Group'] || row['LEDGER GROUP'] || 'Sundry Debtors',
            stateName: stateName,
            normalizedState: normalizedState,
            gstRegType: row['GST Registration Type'] || row['GST REGISTRATION TYPE'] || 'Regular',
            gstin: row['GSTIN/UIN'] || row['GSTIN'] || row['GST'] || ''
          };
          addedCount++;
        }
      });
      
      setPartyMaster(newPartyMaster);
      alert(`✅ Party Master Updated!\n\n${addedCount} party-state combinations loaded.`);
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  // Download Party Master Template
  const downloadPartyMasterTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([
      { 'Sl. No.': 1, 'Name of Ledger': 'ABC PRIVATE LIMITED', 'Ledger Group': 'Sundry Debtors', 'State Name': 'Maharashtra', 'GST Registration Type': 'Regular', 'GSTIN/UIN': '27AAACA1234A1ZQ' },
      { 'Sl. No.': 2, 'Name of Ledger': 'XYZ MEDIA PVT LTD', 'Ledger Group': 'Sundry Debtors', 'State Name': 'Delhi', 'GST Registration Type': 'Regular', 'GSTIN/UIN': '07AAACX5678B1ZR' }
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Party Master');
    XLSX.writeFile(wb, 'Party_Master_Template.xlsx');
  };

  // Historical Ledger Upload Handler
  const handleHistoricalLedgerUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!selectedParty) {
      alert('⚠️ Please select a party first from the list, then import their historical ledger.');
      e.target.value = '';
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const workbook = XLSX.read(event.target.result, { type: 'binary', cellDates: true });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(sheet, { raw: false });
      
      const newLedgerEntries = [];
      let addedCount = 0;
      let currentMainEntry = null;
      
      // Parse numbers - handle formatted numbers with commas
      const parseNumber = (val) => {
        if (!val) return 0;
        const str = String(val).replace(/,/g, '').replace(/[^\d.-]/g, '');
        return parseFloat(str) || 0;
      };
      
      // Parse date
      const parseDate = (dateStr) => {
        if (!dateStr || typeof dateStr !== 'string') return '';
        const trimmed = dateStr.trim();
        const parts = trimmed.split(/[-\/]/);
        if (parts.length === 3) {
          const months = { 'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04', 'may': '05', 'jun': '06', 
                         'jul': '07', 'aug': '08', 'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12' };
          const monthKey = parts[1].toLowerCase().substring(0, 3);
          if (months[monthKey]) {
            const day = parts[0].padStart(2, '0');
            const year = parts[2].length === 2 ? (parseInt(parts[2]) > 50 ? '19' + parts[2] : '20' + parts[2]) : parts[2];
            return `${year}-${months[monthKey]}-${day}`;
          }
        }
        return trimmed;
      };
      
      data.forEach((row, index) => {
        const dateValue = parseDate(row['Date'] || row['DATE'] || row['date'] || '');
        const particular = (row['Particular'] || row['PARTICULAR'] || row['Particulars'] || row['PARTICULARS'] || '').trim();
        const vchType = (row['Vch Type'] || row['VCH TYPE'] || row['Voucher Type'] || row['vch type'] || '').trim();
        const vchNo = (row['Vch No.'] || row['VCH NO.'] || row['Voucher No'] || row['Invoice No'] || row['Vch No'] || row['vch no.'] || '').trim();
        const debit = parseNumber(row['Debit'] || row['DEBIT'] || row['debit']);
        const credit = parseNumber(row['Credit'] || row['CREDIT'] || row['credit']);
        const receiptDate = row['Date of Receipt'] || row['DATE OF RECEIPT'] || row['Receipt Date'] || '';
        const amountReceived = parseNumber(row['Amount Received'] || row['AMOUNT RECEIVED'] || row['amount received']);
        const tdsReceived = parseNumber(row['TDS amount Received'] || row['TDS Received'] || row['TDS'] || row['tds']);
        const balance = parseNumber(row['Balance'] || row['BALANCE'] || row['balance']);
        const paymentStatus = (row['Payment Status'] || row['PAYMENT STATUS'] || row['Status'] || row['status'] || '').trim();
        
        // Check if this is a sub-row (no date, contains line item details)
        const isSubRow = !dateValue && (
          particular.toUpperCase().includes('PROMOTIONAL') || 
          particular.toUpperCase().includes('IGST') || 
          particular.toUpperCase().includes('CGST') || 
          particular.toUpperCase().includes('SGST') ||
          particular.toUpperCase().includes('TRADE EMAILER')
        );
        
        if (isSubRow && currentMainEntry) {
          // Add sub-row to current main entry
          if (!currentMainEntry.subRows) {
            currentMainEntry.subRows = [];
          }
          currentMainEntry.subRows.push({
            particular: particular,
            debit: debit,
            credit: credit
          });
        } else if (dateValue && (vchNo || debit > 0 || credit > 0)) {
          // This is a main entry
          // Save previous main entry if exists
          if (currentMainEntry) {
            newLedgerEntries.push(currentMainEntry);
            addedCount++;
          }
          
          // Determine entry type
          let entryType = 'invoice';
          if (vchType.toLowerCase().includes('credit note') || vchNo.toUpperCase().startsWith('CN')) {
            entryType = 'creditnote';
          } else if (vchType.toLowerCase().includes('receipt')) {
            entryType = 'receipt';
          } else if (vchType.toLowerCase().includes('sale') || debit > 0) {
            entryType = 'invoice';
          }
          
          currentMainEntry = {
            id: Date.now() + index,
            partyName: selectedParty,
            date: dateValue,
            particulars: particular || selectedParty,
            narration: vchNo,
            vchType: vchType || 'Sales',
            vchNo: vchNo,
            debit: debit,
            credit: credit,
            receiptDate: receiptDate,
            amountReceived: amountReceived,
            tdsReceived: tdsReceived,
            balance: balance,
            paymentStatus: paymentStatus,
            type: entryType,
            isHistorical: true,
            subRows: []
          };
        }
      });
      
      // Don't forget the last entry
      if (currentMainEntry) {
        newLedgerEntries.push(currentMainEntry);
        addedCount++;
      }
      
      console.log('Parsed entries with sub-rows:', newLedgerEntries);
      
      if (addedCount > 0) {
        setLedgerEntries(prev => [...prev, ...newLedgerEntries]);
        alert(`✅ Historical Ledger Uploaded!\n\n${addedCount} entries added for "${selectedParty}".`);
      } else {
        alert(`⚠️ No valid ledger entries found in the file.\n\nMake sure your file has these columns:\n• Date (e.g., 02-Jun-21)\n• Vch Type (e.g., Sales, Credit Note)\n• Vch No. (e.g., MB/2022-23/128)\n• Debit or Credit amount`);
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
    setShowHistoricalLedgerModal(false);
  };

  // Download Historical Ledger Template
  const downloadHistoricalLedgerTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([
      { 'Date': '02-Jun-21', 'Particular': 'ABC Corp Ltd.', 'Vch Type': 'Sales', 'Vch No.': 'MB/2020-21/0411', 'Debit': 6000, 'Credit': '', 'Date of Receipt': '', 'Amount Received': 44371, 'TDS amount Received': 5880, 'Balance': '', 'Payment Status': 'Received' },
      { 'Date': '', 'Particular': 'PROMOTIONAL TRADE EMAILERS', 'Vch Type': '', 'Vch No.': '', 'Debit': '', 'Credit': 22500, 'Date of Receipt': '', 'Amount Received': '', 'TDS amount Received': '', 'Balance': '', 'Payment Status': '' },
      { 'Date': '', 'Particular': 'IGST', 'Vch Type': '', 'Vch No.': '', 'Debit': '', 'Credit': 4050, 'Date of Receipt': '', 'Amount Received': '', 'TDS amount Received': '', 'Balance': '', 'Payment Status': '' },
      { 'Date': '26-Mar-25', 'Particular': 'ABC Corp Ltd.', 'Vch Type': 'Credit Note', 'Vch No.': 'CN/2022-23/128', 'Debit': '', 'Credit': 26550, 'Date of Receipt': '', 'Amount Received': '', 'TDS amount Received': '', 'Balance': '', 'Payment Status': '' },
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Historical Ledger');
    XLSX.writeFile(wb, 'Historical_Ledger_Template.xlsx');
  };

  // View invoice from ledger
  const viewInvoiceFromLedger = (invoiceNo) => {
    const invoiceRow = masterData.find(r => r.invoiceNo === invoiceNo);
    if (invoiceRow) {
      downloadInvoice(invoiceRow);
    } else {
      alert('Invoice not found in system. This may be a historical entry.');
    }
  };

  // View Receipt details
  const viewReceipt = (receipt) => {
    const invoice = masterData.find(r => r.invoiceNo === receipt.invoiceNo);
    let message = `📜 RECEIPT DETAILS\n\n`;
    message += `Receipt No: ${receipt.receiptNo}\n`;
    message += `Date: ${formatDate(receipt.date)}\n`;
    message += `Party: ${receipt.partyName}\n`;
    message += `Invoice: ${receipt.invoiceNo}\n\n`;
    message += `─────────────────────\n`;
    message += `Amount Received: ${formatCurrency(receipt.amount || 0)}\n`;
    message += `TDS: ${formatCurrency(receipt.tds || 0)}\n`;
    message += `Discount: ${formatCurrency(receipt.discount || 0)}\n`;
    message += `─────────────────────\n`;
    message += `Total: ${formatCurrency((receipt.amount || 0) + (receipt.tds || 0) + (receipt.discount || 0))}\n`;
    if (receipt.remarks) {
      message += `\nRemarks: ${receipt.remarks}`;
    }
    alert(message);
  };

  // View Credit Note details
  const viewCreditNote = (cn) => {
    let message = `📝 CREDIT NOTE DETAILS\n\n`;
    message += `Credit Note No: ${cn.creditNoteNo}\n`;
    message += `Date: ${formatDate(cn.date)}\n`;
    message += `Party: ${cn.partyName}\n`;
    message += `Against Invoice: ${cn.invoiceNo}\n\n`;
    message += `─────────────────────\n`;
    message += `Base Amount: ${formatCurrency(cn.amount || 0)}\n`;
    message += `${cn.gstType || 'GST'}: ${formatCurrency(cn.gst || 0)}\n`;
    message += `─────────────────────\n`;
    message += `Total Credit: ${formatCurrency(cn.totalAmount || ((cn.amount || 0) + (cn.gst || 0)))}\n`;
    if (cn.reason) {
      message += `\nReason: ${cn.reason}`;
    }
    alert(message);
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
      // Using: date, time, campaign name, and subject
      const existingKeys = new Set(
        safeMasterData.map(row => `${row.date}|${row.time || ''}|${row.campaignName || ''}|${row.subject}`.toLowerCase())
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
        const time = row['TIME'] || row['Time'] || '';
        const defaultAmount = invoiceValues[partyName] || '';
        const dateStr = dateValue instanceof Date && !isNaN(dateValue) ? dateValue.toISOString().split('T')[0] : '';
        
        // Create unique key for this campaign using: date, time, campaign name, and subject
        const campaignKey = `${dateStr}|${time}|${campaignName}|${subject}`.toLowerCase();
        
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
      
      // Add notification for director
      if (addedCount > 0) {
        addNotification('upload', `📊 ${addedCount} new campaigns uploaded to Master Sheet`, 'director');
      }
      
      alert(message);
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  // Clear Master Data Function (clears campaigns, invoices, receipts, ledger entries)
  const clearMasterData = async () => {
    // Clear all state
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
    setFollowups([]);
    setPartyMaster({});
    setNotifications([]);
    
    // Directly save cleared data to Firebase (don't rely on state which is async)
    try {
      await saveAppState('indreesh-media', {
        masterData: [],
        ledgerEntries: [],
        receipts: [],
        creditNotes: [],
        openingBalances: {},
        mailerImages: {},
        mailerLogo,
        companyConfig,
        nextInvoiceNo: 1,
        nextCombineNo: 1,
        nextReceiptNo: 1,
        nextCreditNoteNo: 1,
        invoiceValues,
        notifications: [],
        whatsappSettings,
        partyMaster: {},
        followups: [],
        userPasswords
      });
      console.log('Data cleared and saved to Firebase');
    } catch (error) {
      console.error('Error clearing data:', error);
    }
    
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
    const row = masterData.find(r => r.id === rowId);
    setMasterData(prev => prev.map(r => {
      if (r.id === rowId) {
        if (status === 'Yes' && r.invoiceAmount) {
          const gst = calculateGst(r);
          return { ...r, toBeBilled: status, cgst: gst.cgst.toFixed(2), sgst: gst.sgst.toFixed(2), igst: gst.igst.toFixed(2), totalWithGst: gst.total.toFixed(2) };
        }
        return { ...r, toBeBilled: status };
      }
      return r;
    }));
    
    // Notify finance when director marks campaign for billing
    if (status === 'Yes' && row) {
      addNotification('info', `📋 Campaign marked for billing: ${row.partyName} - ${row.senderName}`, 'finance');
    }
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
    
    // Notify director when mail is sent
    if (status === 'Yes') {
      addNotification('info', `📧 Invoice ${row.invoiceNo} mailed to ${row.partyName}`, 'director');
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
    
    // Note: Ledger entry will be created only when invoice is approved
    setNextInvoiceNo(prev => prev + 1);
    
    // Notify director about new invoice
    addNotification('invoice', `🧾 New Invoice ${invoiceNo} created for ${row.partyName} - ${formatCurrency(totalAmount)}`, 'director');
    
    // Data will auto-save in 1 second
    // Auto-save will handle this
    
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

    // Note: Ledger entry will be created only when invoice is approved
    setNextInvoiceNo(prev => prev + 1);
    setNextCombineNo(prev => prev + 1);
    setShowCombineModal(false);
    setSelectedForCombine(new Set());
    
    // Notify director about new combined invoice
    addNotification('invoice', `🧾 Combined Invoice ${invoiceNo} created for ${combineParty} (${selectedRows.length} campaigns) - ${formatCurrency(totalAmount)}`, 'director');
    
    // Data will auto-save in 1 second
    // Auto-save will handle this
    
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
    
    // Get party GSTIN by matching party name AND state
    const partyGstin = getPartyGstin(row.partyName, row.statePartyDetails);
    
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
          <div style="text-align: center; margin-bottom: 25px;">
            <span style="font-size: 22px; font-weight: bold; color: #2874A6;">${companyConfig.name}</span>
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
      <div style="text-align: center; padding: 12px; font-size: 18px; font-weight: bold; border-bottom: 2px solid #000; background: #f8f8f8;">Tax Invoice</div>
      <div style="text-align: center; font-size: 11px; font-style: italic; padding: 5px; border-bottom: 1px solid #000; background: #fafafa;">(Original for Recipient)</div>
      <div style="display: flex; border-bottom: 2px solid #000;">
        <div style="flex: 1.5; padding: 12px; border-right: 2px solid #000;">
          <div style="font-size: 16px; font-weight: bold; margin-bottom: 8px; color: #1a5276;">${companyConfig.name}</div>
          <div style="font-size: 11px; line-height: 1.5; color: #333;">${companyConfig.address}<br>${companyConfig.addressLine2}<br>${companyConfig.city}<br><strong>GSTIN/UIN:</strong> ${companyConfig.gstin}<br><strong>State:</strong> ${companyConfig.stateName}, Code: ${companyConfig.stateCode}<br><strong>Contact:</strong> ${companyConfig.phone}<br><strong>E-Mail:</strong> ${companyConfig.email}</div>
        </div>
        <div style="flex: 1; font-size: 12px;">
          <div style="display: flex; border-bottom: 1px solid #000;"><div style="flex: 1; padding: 8px; border-right: 1px solid #000; font-weight: bold; background: #f5f5f5;">Invoice No.</div><div style="flex: 1; padding: 8px; font-weight: 600; color: #1a5276;">${row.invoiceNo || ''}</div></div>
          <div style="display: flex;"><div style="flex: 1; padding: 8px; border-right: 1px solid #000; font-weight: bold; background: #f5f5f5;">Dated</div><div style="flex: 1; padding: 8px;">${formatDate(row.invoiceDate || row.date)}</div></div>
        </div>
      </div>
      <div style="padding: 10px 12px; border-bottom: 2px solid #000; background: #fafafa;">
        <div style="font-size: 11px; color: #666; margin-bottom: 3px;">Buyer (Bill to)</div>
        <div style="font-size: 14px; font-weight: bold; margin-bottom: 4px; color: #1a5276;">${row.partyName}</div>
        <div style="font-size: 11px; color: #333;">${row.statePartyDetails || ''}${partyGstin ? '<br><strong>GSTIN/UIN:</strong> ' + partyGstin : ''}<br>Place of Supply: ${row.statePartyDetails || companyConfig.stateName}</div>
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
      { id: 'followups', icon: Phone, label: 'Followups' },
      { id: 'reports', icon: BarChart3, label: 'Reports' },
      { id: 'settings', icon: Settings, label: 'Settings' }
    ];
    
    const directorMenuItems = [
      { id: 'master', icon: Table, label: 'Master Sheet' },
      { id: 'invoices', icon: FileText, label: 'Invoice Register' },
      { id: 'ledgers', icon: BookOpen, label: 'Party Ledgers' },
      { id: 'followups', icon: Phone, label: 'Followups' },
      { id: 'reports', icon: BarChart3, label: 'Reports' }
    ];
    
    const menuItems = userRole === 'director' ? directorMenuItems : financeMenuItems;

    return (
      <div style={{ width: sidebarCollapsed ? '60px' : '220px', backgroundColor: '#1E293B', color: '#FFFFFF', display: 'flex', flexDirection: 'column', transition: 'width 0.2s ease', flexShrink: 0 }}>
        <div style={{ padding: sidebarCollapsed ? '12px' : '16px', borderBottom: '1px solid #334155', display: 'flex', alignItems: 'center', justifyContent: sidebarCollapsed ? 'center' : 'space-between' }}>
          {!sidebarCollapsed && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <img src="/logo.png" alt="JAC" style={{ width: '32px', height: 'auto', borderRadius: '4px', backgroundColor: 'white', padding: '2px' }} />
              <div>
                <div style={{ fontSize: '16px', fontWeight: '700' }}>FinMate</div>
                <div style={{ fontSize: '10px', color: '#94A3B8' }}>{userRole === 'director' ? 'Director View' : 'Finance Team'}</div>
              </div>
            </div>
          )}
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
        
        {/* Notifications Bell */}
        <div style={{ padding: '8px', borderBottom: '1px solid #334155' }}>
          <button 
            onClick={() => setShowNotificationsModal(true)} 
            style={{ 
              width: '100%', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '10px', 
              padding: sidebarCollapsed ? '12px' : '11px 14px', 
              borderRadius: '8px', 
              border: 'none', 
              backgroundColor: unreadCount > 0 ? '#FEF3C7' : '#334155', 
              color: unreadCount > 0 ? '#92400E' : '#94A3B8', 
              cursor: 'pointer', 
              fontSize: '14px', 
              fontWeight: unreadCount > 0 ? '700' : '500', 
              justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
              position: 'relative'
            }} 
            title="Notifications"
          >
            {unreadCount > 0 ? <BellRing size={18} /> : <Bell size={18} />}
            {!sidebarCollapsed && <span>Notifications</span>}
            {unreadCount > 0 && (
              <span style={{ 
                position: sidebarCollapsed ? 'absolute' : 'static',
                top: sidebarCollapsed ? '4px' : 'auto',
                right: sidebarCollapsed ? '4px' : 'auto',
                marginLeft: sidebarCollapsed ? '0' : 'auto',
                backgroundColor: '#DC2626', 
                color: '#FFFFFF', 
                padding: '2px 6px', 
                borderRadius: '10px', 
                fontSize: '11px', 
                fontWeight: '700',
                minWidth: '18px',
                textAlign: 'center'
              }}>
                {unreadCount}
              </span>
            )}
          </button>
        </div>
        
        <nav style={{ flex: 1, padding: '8px' }}>
          {menuItems.map(item => (
            <button key={item.id} onClick={() => setActiveMenu(item.id)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: sidebarCollapsed ? '12px' : '11px 14px', marginBottom: '4px', borderRadius: '8px', border: 'none', backgroundColor: activeMenu === item.id ? '#2874A6' : 'transparent', color: activeMenu === item.id ? '#FFFFFF' : '#94A3B8', cursor: 'pointer', fontSize: '14px', fontWeight: activeMenu === item.id ? '600' : '500', justifyContent: sidebarCollapsed ? 'center' : 'flex-start' }} title={item.label}>
              <item.icon size={18} />
              {!sidebarCollapsed && <span>{item.label}</span>}
            </button>
          ))}
        </nav>
        {/* Change Password & Logout buttons */}
        <div style={{ padding: '8px', borderTop: '1px solid #334155' }}>
          <button onClick={() => { setShowPasswordModal(true); setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' }); setPasswordError(''); }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: sidebarCollapsed ? '12px' : '11px 14px', marginBottom: '8px', borderRadius: '8px', border: 'none', backgroundColor: '#475569', color: '#FFFFFF', cursor: 'pointer', fontSize: '14px', fontWeight: '500', justifyContent: sidebarCollapsed ? 'center' : 'flex-start' }} title="Change Password">
            <Lock size={18} />
            {!sidebarCollapsed && <span>Change Password</span>}
          </button>
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
    // Separate open and closed invoices
    // Closed = billed (toBeBilled=Yes) + invoiced + mailed (mailingSent=Yes) + (receipt received OR cancelled by CN OR balance = 0)
    const closedInvoices = masterData.filter(r => 
      r.toBeBilled === 'Yes' && 
      r.invoiceGenerated && 
      r.mailingSent === 'Yes' && 
      (r.receiptStatus === 'Received' || r.receiptStatus === 'Cancelled' || r.receiptStatus === 'Closed')
    );
    const openInvoices = masterData.filter(r => 
      !(r.toBeBilled === 'Yes' && 
        r.invoiceGenerated && 
        r.mailingSent === 'Yes' && 
        (r.receiptStatus === 'Received' || r.receiptStatus === 'Cancelled' || r.receiptStatus === 'Closed'))
    );
    
    // Apply filters to the current tab's data
    const currentTabData = masterSheetTab === 'open' ? openInvoices : closedInvoices;
    const filteredTabData = currentTabData.filter(row => {
      if (filters.party && row.partyName !== filters.party) return false;
      if (filters.billStatus && row.toBeBilled !== filters.billStatus) return false;
      if (filters.invoiceType && row.invoiceType !== filters.invoiceType) return false;
      if (filters.mailingStatus) {
        if (filters.mailingStatus === 'Sent' && row.mailingSent !== 'Yes') return false;
        if (filters.mailingStatus === 'Not Sent' && row.mailingSent === 'Yes') return false;
      }
      if (filters.invoiceStatus) {
        if (filters.invoiceStatus === 'Generated' && !row.invoiceGenerated) return false;
        if (filters.invoiceStatus === 'Not Generated' && row.invoiceGenerated) return false;
        if (filters.invoiceStatus === 'Approved' && row.invoiceStatus !== 'Approved') return false;
        if (filters.invoiceStatus === 'Need Edits' && row.invoiceStatus !== 'Need Edits') return false;
        if (filters.invoiceStatus === 'Paid' && row.invoiceStatus !== 'Paid') return false;
      }
      if (filters.searchText) {
        const search = filters.searchText.toLowerCase();
        if (!row.partyName?.toLowerCase().includes(search) && 
            !row.senderName?.toLowerCase().includes(search) && 
            !row.campaignName?.toLowerCase().includes(search) && 
            !row.subject?.toLowerCase().includes(search) &&
            !row.invoiceNo?.toLowerCase().includes(search)) return false;
      }
      return true;
    });
    
    const groupedTabData = filteredTabData.reduce((acc, row) => {
      const party = row.partyName || 'Unknown';
      if (!acc[party]) acc[party] = [];
      acc[party].push(row);
      return acc;
    }, {});
    
    const partyNames = Object.keys(groupedTabData).sort();

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

        {/* Tabs for Open/Closed Invoices */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '16px', backgroundColor: '#F1F5F9', padding: '4px', borderRadius: '10px', width: 'fit-content' }}>
          <button
            onClick={() => setMasterSheetTab('open')}
            style={{
              padding: '10px 20px', fontSize: '14px', fontWeight: '600', border: 'none', borderRadius: '8px', cursor: 'pointer',
              backgroundColor: masterSheetTab === 'open' ? '#FFFFFF' : 'transparent',
              color: masterSheetTab === 'open' ? '#1E293B' : '#64748B',
              boxShadow: masterSheetTab === 'open' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none'
            }}
          >
            📂 Open Invoices ({openInvoices.length})
          </button>
          <button
            onClick={() => setMasterSheetTab('closed')}
            style={{
              padding: '10px 20px', fontSize: '14px', fontWeight: '600', border: 'none', borderRadius: '8px', cursor: 'pointer',
              backgroundColor: masterSheetTab === 'closed' ? '#FFFFFF' : 'transparent',
              color: masterSheetTab === 'closed' ? '#1E293B' : '#64748B',
              boxShadow: masterSheetTab === 'closed' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none'
            }}
          >
            ✅ Closed Invoices ({closedInvoices.length})
          </button>
        </div>

        {masterData.length > 0 && renderFilters()}

        {partyNames.length === 0 ? (
          <Card>
            <div style={{ padding: '60px', textAlign: 'center', color: '#94A3B8' }}>
              <Upload size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
              <div style={{ fontSize: '18px', fontWeight: '600' }}>{hasActiveFilters ? 'No matching records' : (masterSheetTab === 'closed' ? 'No closed invoices yet' : 'No Data Yet')}</div>
              <div style={{ fontSize: '14px', marginTop: '4px' }}>{hasActiveFilters ? 'Try adjusting your filters' : (masterSheetTab === 'closed' ? 'Invoices will appear here once billed, mailed, and payment received' : 'Upload an Excel file to get started')}</div>
            </div>
          </Card>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {partyNames.map(party => {
              const rows = groupedTabData[party];
              const isExpanded = expandedParties.has(party);
              const billedCount = rows.filter(r => r.toBeBilled === 'Yes').length;
              const invoicedCount = rows.filter(r => r.invoiceGenerated).length;
              const partyTotal = rows.filter(r => r.toBeBilled === 'Yes').reduce((sum, r) => sum + (parseFloat(r.totalWithGst) || 0), 0);

              return (
                <div key={party} style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                  <div onClick={() => togglePartyExpansion(party)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', backgroundColor: masterSheetTab === 'closed' ? '#F0FDF4' : '#F8FAFC', cursor: 'pointer', borderBottom: isExpanded ? '3px solid #2874A6' : 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {isExpanded ? <ChevronDown size={22} color="#2874A6" /> : <ChevronRight size={22} color="#64748B" />}
                      <div>
                        <div style={{ fontWeight: '700', fontSize: '16px', color: '#1E293B' }}>{party}</div>
                        <div style={{ fontSize: '13px', color: '#64748B', marginTop: '3px' }}>{rows.length} campaigns • {billedCount} billed • {invoicedCount} invoiced</div>
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
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', minWidth: '2100px' }}>
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
                            <th style={{ padding: '12px 14px', textAlign: 'center', fontWeight: '700', color: '#059669', borderBottom: '2px solid #E2E8F0', backgroundColor: '#F0FDF4', width: '90px' }}>Mail Date</th>
                            <th style={{ padding: '12px 14px', textAlign: 'center', fontWeight: '700', color: '#7C3AED', borderBottom: '2px solid #E2E8F0', backgroundColor: '#FAF5FF', width: '100px' }}>Receipt</th>
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
                                
                                <td style={{ padding: '10px 14px', backgroundColor: '#EFF6FF' }}>
                                  {row.invoiceNo ? <span style={{ fontWeight: '700', color: '#1E40AF', fontSize: '12px' }}>{row.invoiceNo}</span> : <span style={{ color: '#CBD5E1' }}>-</span>}
                                </td>
                                <td style={{ padding: '10px 14px', backgroundColor: '#EFF6FF', fontSize: '12px' }}>{row.invoiceDate ? formatDate(row.invoiceDate) : '-'}</td>
                                <td style={{ padding: '10px 14px', backgroundColor: '#EFF6FF', textAlign: 'right', fontWeight: '700', color: '#1E40AF', fontSize: '13px' }}>{row.invoiceTotalAmount ? formatCurrencyShort(row.invoiceTotalAmount) : '-'}</td>
                                <td style={{ padding: '10px 14px', textAlign: 'center', backgroundColor: '#FAF5FF' }}>
                                  {row.combinationCode && row.combinationCode !== 'NA' ? <span style={{ fontWeight: '700', color: '#7C3AED', fontSize: '12px' }}>{row.combinationCode}</span> : '-'}
                                </td>
                                
                                <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                                  {row.invoiceGenerated ? (
                                    isDirector ? (
                                      <button onClick={() => openApprovalModal(row)} style={{ padding: '5px 10px', fontSize: '11px', fontWeight: '700', border: '1.5px solid', borderRadius: '6px', cursor: 'pointer', backgroundColor: row.invoiceStatus === 'Approved' ? '#DCFCE7' : (row.invoiceStatus === 'Need Edits' ? '#FEE2E2' : '#FEF3C7'), borderColor: row.invoiceStatus === 'Approved' ? '#22C55E' : (row.invoiceStatus === 'Need Edits' ? '#DC2626' : '#F59E0B'), color: row.invoiceStatus === 'Approved' ? '#166534' : (row.invoiceStatus === 'Need Edits' ? '#991B1B' : '#92400E') }}>
                                        {row.invoiceStatus === 'Approved' ? '✅ Approved' : (row.invoiceStatus === 'Need Edits' ? '✏️ Need Edits' : '⏳ Review')}
                                      </button>
                                    ) : (
                                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                        <span style={{ padding: '4px 10px', fontSize: '11px', fontWeight: '700', borderRadius: '6px', backgroundColor: row.invoiceStatus === 'Approved' ? '#DCFCE7' : (row.invoiceStatus === 'Need Edits' ? '#FEE2E2' : '#FEF3C7'), color: row.invoiceStatus === 'Approved' ? '#166534' : (row.invoiceStatus === 'Need Edits' ? '#991B1B' : '#92400E') }}>
                                          {row.invoiceStatus === 'Approved' ? '✅ Approved' : (row.invoiceStatus === 'Need Edits' ? '✏️ Need Edits' : '⏳ Pending')}
                                        </span>
                                        {(row.editComments || row.approvalRemarks) && (
                                          <button 
                                            onClick={() => { setSelectedRow(row); setShowApprovalModal(true); }}
                                            style={{ fontSize: '9px', color: row.invoiceStatus === 'Need Edits' ? '#991B1B' : '#166534', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                                            title={row.editComments || row.approvalRemarks}
                                          >
                                            View Remarks
                                          </button>
                                        )}
                                      </div>
                                    )
                                  ) : <span style={{ color: '#CBD5E1' }}>-</span>}
                                </td>
                                
                                <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                                  {row.invoiceGenerated && row.invoiceStatus === 'Approved' ? (
                                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                                      <ActionButton icon={Eye} small onClick={() => downloadInvoice(row)} title="View Invoice" />
                                      {canEdit && (
                                        <ActionButton icon={Mail} small variant="brand" onClick={() => {
                                          setSelectedRow(row);
                                          setShowEmailModal(true);
                                        }} title="Send Email" />
                                      )}
                                      {canEdit && <ActionButton icon={Trash2} small variant="danger" onClick={() => openDeleteConfirm(row)} title="Delete" />}
                                    </div>
                                  ) : row.invoiceGenerated ? (
                                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                                      <ActionButton icon={Eye} small onClick={() => downloadInvoice(row)} title="View Invoice" />
                                      {canEdit && <ActionButton icon={Trash2} small variant="danger" onClick={() => openDeleteConfirm(row)} title="Delete" />}
                                    </div>
                                  ) : <span style={{ color: '#CBD5E1' }}>-</span>}
                                </td>
                                
                                <td style={{ padding: '10px 14px', textAlign: 'center', backgroundColor: '#F0FDF4' }}>
                                  {row.invoiceGenerated && row.invoiceStatus === 'Approved' && canEdit ? (
                                    mailDisabled ? <span style={{ fontSize: '10px', color: '#94A3B8' }}>Combined sent</span> : (
                                      <select value={row.mailingSent || 'No'} onChange={(e) => updateRowField(row.id, 'mailingSent', e.target.value)}
                                        style={{ padding: '5px 8px', fontSize: '11px', fontWeight: '700', border: '2px solid', borderRadius: '6px', borderColor: row.mailingSent === 'Yes' ? '#22C55E' : '#E2E8F0', backgroundColor: row.mailingSent === 'Yes' ? '#DCFCE7' : '#FFFFFF', color: row.mailingSent === 'Yes' ? '#166534' : '#64748B', cursor: 'pointer', width: '60px' }}>
                                        <option value="No">No</option>
                                        <option value="Yes">Yes</option>
                                      </select>
                                    )
                                  ) : row.invoiceGenerated && row.invoiceStatus === 'Approved' && isDirector ? (
                                    <span style={{ padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '600', backgroundColor: row.mailingSent === 'Yes' ? '#DCFCE7' : '#FEF3C7', color: row.mailingSent === 'Yes' ? '#166534' : '#92400E' }}>{row.mailingSent === 'Yes' ? '✅ Yes' : '⏳ No'}</span>
                                  ) : row.invoiceGenerated && row.invoiceStatus !== 'Approved' ? (
                                    <span style={{ fontSize: '10px', color: '#94A3B8' }}>Approve first</span>
                                  ) : <span style={{ color: '#CBD5E1' }}>-</span>}
                                </td>
                                
                                {/* Mail Date Column */}
                                <td style={{ padding: '10px 14px', textAlign: 'center', backgroundColor: '#F0FDF4' }}>
                                  {row.mailingSent === 'Yes' ? (
                                    canEdit ? (
                                      <input
                                        type="date"
                                        value={row.mailDate || row.invoiceDate || ''}
                                        onChange={(e) => updateRowField(row.id, 'mailDate', e.target.value)}
                                        style={{ padding: '4px 6px', fontSize: '11px', border: '1.5px solid #D1D5DB', borderRadius: '6px', width: '100%' }}
                                      />
                                    ) : (
                                      <span style={{ fontSize: '11px' }}>{formatDate(row.mailDate || row.invoiceDate)}</span>
                                    )
                                  ) : <span style={{ color: '#CBD5E1' }}>-</span>}
                                </td>
                                
                                {/* Receipt Status Column */}
                                <td style={{ padding: '10px 14px', textAlign: 'center', backgroundColor: '#FAF5FF' }}>
                                  {row.receiptStatus === 'Received' || row.receiptStatus === 'Closed' ? (
                                    <span style={{ padding: '4px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '700', backgroundColor: '#DCFCE7', color: '#166534' }}>✅ {row.receiptNo || 'Received'}</span>
                                  ) : row.receiptStatus === 'Cancelled' ? (
                                    <span style={{ padding: '4px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '700', backgroundColor: '#FEE2E2', color: '#991B1B' }}>❌ Cancelled</span>
                                  ) : row.invoiceGenerated && row.invoiceStatus === 'Approved' ? (
                                    <span style={{ padding: '4px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '600', backgroundColor: '#FEF3C7', color: '#92400E' }}>⏳ Pending</span>
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

        {currentTabData.length > 0 && (
          <div style={{ marginTop: '16px', padding: '16px 20px', backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '24px', fontSize: '14px', color: '#475569' }}>
              <span>📊 Total: <strong>{filteredTabData.length}</strong></span>
              <span>✅ To Bill: <strong>{filteredTabData.filter(r => r.toBeBilled === 'Yes').length}</strong></span>
              <span>🧾 Invoiced: <strong>{filteredTabData.filter(r => r.invoiceGenerated).length}</strong></span>
              <span>✅ Approved: <strong>{filteredTabData.filter(r => r.invoiceStatus === 'Approved').length}</strong></span>
              {masterSheetTab === 'closed' && <span>💰 Closed: <strong>{filteredTabData.filter(r => r.receiptStatus === 'Received' || r.receiptStatus === 'Cancelled' || r.receiptStatus === 'Closed').length}</strong></span>}
            </div>
            <div style={{ fontSize: '18px', fontWeight: '700', color: '#059669' }}>
              Total: {formatCurrency(filteredTabData.filter(r => r.toBeBilled === 'Yes').reduce((sum, r) => sum + (parseFloat(r.totalWithGst) || 0), 0))}
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
    
    // Add invoices from masterData (new system)
    safeMasterData.filter(r => r.invoiceGenerated).forEach(row => {
      if (!invoiceMap.has(row.invoiceNo)) {
        invoiceMap.set(row.invoiceNo, { 
          invoiceNo: row.invoiceNo, 
          partyName: row.partyName, 
          date: row.invoiceDate, 
          invoiceType: row.invoiceType, 
          combinationCode: row.combinationCode, 
          invoiceStatus: row.invoiceStatus, 
          mailingSent: row.mailingSent,
          receiptStatus: row.receiptStatus || 'Pending',
          receiptNo: row.receiptNo,
          campaigns: [row], 
          totalAmount: parseFloat(row.invoiceTotalAmount) || 0,
          isFromMaster: true
        });
      } else {
        invoiceMap.get(row.invoiceNo).campaigns.push(row);
      }
    });
    
    // Helper to extract year+suffix for CN matching
    const getInvoiceYearSuffix = (vchNo) => {
      if (!vchNo) return '';
      const parts = vchNo.split('/');
      if (parts.length >= 3) {
        return parts.slice(1).join('/');
      } else if (parts.length === 2) {
        return parts.join('/');
      }
      return parts[parts.length - 1];
    };
    
    // Build CN map for matching
    const historicalCNs = safeLedgerEntries.filter(e => 
      e.isHistorical && (e.type === 'creditnote' || e.vchNo?.toUpperCase().startsWith('CN'))
    );
    const cnMapForRegister = new Map();
    safeCreditNotes.forEach(cn => {
      const key = getInvoiceYearSuffix(cn.invoiceNo);
      if (key) cnMapForRegister.set(key, cn);
    });
    historicalCNs.forEach(cn => {
      const key = getInvoiceYearSuffix(cn.vchNo);
      if (key && !cnMapForRegister.has(key)) cnMapForRegister.set(key, cn);
    });
    
    // Add historical invoices from ledgerEntries - ONLY PENDING or PARTIAL CN (not CN Closed)
    safeLedgerEntries.filter(e => 
      e.isHistorical && 
      e.type !== 'creditnote' && 
      !e.vchNo?.toUpperCase().startsWith('CN') &&
      e.debit > 0
    ).forEach(entry => {
      if (!invoiceMap.has(entry.vchNo)) {
        // Check if receipt exists for this historical invoice
        const existingReceipt = safeReceipts.find(r => r.invoiceNo === entry.vchNo);
        
        // Check if fully covered by CN
        const invYearSuffix = getInvoiceYearSuffix(entry.vchNo);
        const matchingCN = cnMapForRegister.get(invYearSuffix);
        const cnAmount = matchingCN ? Math.abs(parseFloat(matchingCN.totalAmount) || parseFloat(matchingCN.credit) || parseFloat(matchingCN.debit) || 0) : 0;
        const debit = parseFloat(entry.debit) || 0;
        const isFullyCoveredByCN = matchingCN && cnAmount >= debit;
        
        // Skip if fully covered by CN (CN Closed)
        if (isFullyCoveredByCN) return;
        
        const isPending = !existingReceipt && !(entry.amountReceived > 0);
        const hasPartialCN = matchingCN && cnAmount > 0 && cnAmount < debit;
        
        // Only add if pending or partial CN (no receipt received and not fully covered by CN)
        if (isPending || hasPartialCN) {
          const pendingAmount = hasPartialCN ? debit - cnAmount : debit;
          invoiceMap.set(entry.vchNo, {
            invoiceNo: entry.vchNo,
            partyName: entry.partyName,
            date: entry.date,
            invoiceType: 'Historical',
            combinationCode: '',
            invoiceStatus: 'Approved',
            mailingSent: 'Yes',
            receiptStatus: hasPartialCN ? 'Partial CN' : 'Pending',
            receiptNo: '',
            campaigns: [],
            totalAmount: debit,
            pendingAmount: pendingAmount,
            hasPartialCN: hasPartialCN,
            cnAmount: cnAmount,
            isHistorical: true,
            historicalEntry: entry
          });
        }
      }
    });
    
    // Apply filters
    let invoices = Array.from(invoiceMap.values());
    if (invoiceFilters.party) {
      invoices = invoices.filter(inv => inv.partyName === invoiceFilters.party);
    }
    if (invoiceFilters.invoiceStatus) {
      invoices = invoices.filter(inv => inv.invoiceStatus === invoiceFilters.invoiceStatus);
    }
    if (invoiceFilters.receiptStatus) {
      if (invoiceFilters.receiptStatus === 'Received') {
        invoices = invoices.filter(inv => inv.receiptStatus === 'Received');
      } else if (invoiceFilters.receiptStatus === 'Pending') {
        invoices = invoices.filter(inv => inv.receiptStatus !== 'Received');
      }
    }
    if (invoiceFilters.invoiceType) {
      invoices = invoices.filter(inv => inv.invoiceType === invoiceFilters.invoiceType);
    }
    if (invoiceFilters.searchText) {
      const search = invoiceFilters.searchText.toLowerCase();
      invoices = invoices.filter(inv => 
        inv.invoiceNo?.toLowerCase().includes(search) ||
        inv.partyName?.toLowerCase().includes(search)
      );
    }

    // Group invoices by party for client-wise display
    const invoicesByParty = {};
    invoices.forEach(inv => {
      if (!invoicesByParty[inv.partyName]) {
        invoicesByParty[inv.partyName] = [];
      }
      invoicesByParty[inv.partyName].push(inv);
    });
    
    // Sort parties alphabetically
    const sortedParties = Object.keys(invoicesByParty).sort();

    const hasInvoiceFilters = invoiceFilters.party || invoiceFilters.invoiceStatus || invoiceFilters.receiptStatus || invoiceFilters.invoiceType || invoiceFilters.searchText;
    const allInvoices = Array.from(invoiceMap.values());

    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '700', color: '#1E293B' }}>🧾 Invoice & Receipt Register</h1>
          {isDirector && <span style={{ padding: '8px 16px', backgroundColor: '#FEF3C7', borderRadius: '8px', fontSize: '13px', color: '#92400E', fontWeight: '600' }}>👁️ View Only</span>}
        </div>
        
        {/* Filters */}
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', border: '1px solid #E2E8F0', padding: '14px 18px', marginBottom: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Filter size={18} color="#64748B" />
              <span style={{ fontSize: '13px', fontWeight: '700', color: '#475569' }}>Filters:</span>
            </div>
            
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
              <input 
                type="text" 
                placeholder="Search invoice..." 
                value={invoiceFilters.searchText} 
                onChange={(e) => setInvoiceFilters(prev => ({ ...prev, searchText: e.target.value }))}
                style={{ padding: '8px 12px 8px 32px', fontSize: '13px', border: '1.5px solid #E2E8F0', borderRadius: '8px', width: '160px' }}
              />
            </div>
            
            <select value={invoiceFilters.party} onChange={(e) => setInvoiceFilters(prev => ({ ...prev, party: e.target.value }))}
              style={{ padding: '8px 12px', fontSize: '13px', border: '1.5px solid #E2E8F0', borderRadius: '8px', backgroundColor: '#FFFFFF' }}>
              <option value="">All Parties</option>
              {parties.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            
            <select value={invoiceFilters.invoiceStatus} onChange={(e) => setInvoiceFilters(prev => ({ ...prev, invoiceStatus: e.target.value }))}
              style={{ padding: '8px 12px', fontSize: '13px', border: '1.5px solid #E2E8F0', borderRadius: '8px', backgroundColor: '#FFFFFF' }}>
              <option value="">All Status</option>
              <option value="Created">Created</option>
              <option value="Approved">Approved</option>
              <option value="Need Edits">Need Edits</option>
            </select>
            
            <select value={invoiceFilters.receiptStatus} onChange={(e) => setInvoiceFilters(prev => ({ ...prev, receiptStatus: e.target.value }))}
              style={{ padding: '8px 12px', fontSize: '13px', border: '1.5px solid #E2E8F0', borderRadius: '8px', backgroundColor: '#FFFFFF' }}>
              <option value="">All Receipts</option>
              <option value="Received">Received</option>
              <option value="Pending">Pending</option>
            </select>
            
            <select value={invoiceFilters.invoiceType} onChange={(e) => setInvoiceFilters(prev => ({ ...prev, invoiceType: e.target.value }))}
              style={{ padding: '8px 12px', fontSize: '13px', border: '1.5px solid #E2E8F0', borderRadius: '8px', backgroundColor: '#FFFFFF' }}>
              <option value="">All Types</option>
              <option value="Individual">Individual</option>
              <option value="Combined">Combined</option>
            </select>
            
            {hasInvoiceFilters && (
              <>
                <button onClick={() => setInvoiceFilters({ party: '', invoiceStatus: '', receiptStatus: '', invoiceType: '', searchText: '' })} 
                  style={{ padding: '8px 12px', fontSize: '13px', fontWeight: '600', border: '1.5px solid #FCA5A5', borderRadius: '8px', backgroundColor: '#FEE2E2', color: '#991B1B', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <X size={14} /> Clear
                </button>
                <span style={{ fontSize: '13px', color: '#64748B' }}>Showing {invoices.length} of {allInvoices.length}</span>
              </>
            )}
          </div>
        </div>
        
        <Card noPadding>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '2px solid #E2E8F0' }}>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: '700' }}>Invoice No</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: '700' }}>Date</th>
                <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: '700' }}>Type</th>
                <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '700' }}>Amount</th>
                <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '700', backgroundColor: '#F0FDF4', color: '#166534' }}>Received</th>
                <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '700', backgroundColor: '#FEF3C7', color: '#92400E' }}>TDS</th>
                <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '700', backgroundColor: '#FEE2E2', color: '#991B1B' }}>CN Amt</th>
                <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '700', backgroundColor: '#EFF6FF', color: '#1E40AF' }}>Balance</th>
                <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: '700' }}>Inv. Status</th>
                <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: '700' }}>Receipt No.</th>
                <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: '700' }}>CN No.</th>
                <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: '700' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedParties.length === 0 ? (
                <tr><td colSpan="12" style={{ padding: '50px', textAlign: 'center', color: '#94A3B8' }}>{hasInvoiceFilters ? 'No matching invoices' : 'No invoices generated yet'}</td></tr>
              ) : (
                sortedParties.map(party => {
                  const partyInvoices = invoicesByParty[party];
                  const isExpanded = expandedParties.has(party);
                  
                  // Calculate total balance for the party
                  let partyTotalBalance = 0;
                  partyInvoices.forEach(inv => {
                    const invoiceReceipt = receipts.find(r => r.invoiceNo === inv.invoiceNo);
                    const invoiceCN = creditNotes.find(cn => cn.invoiceNo === inv.invoiceNo);
                    const tdsEntry = ledgerEntries.find(e => e.invoiceNo === inv.invoiceNo && e.type === 'tds');
                    const discountEntry = ledgerEntries.find(e => e.invoiceNo === inv.invoiceNo && e.type === 'discount');
                    
                    const invoiceAmount = inv.totalAmount || 0;
                    const receivedAmount = invoiceReceipt ? (parseFloat(invoiceReceipt.amount) || 0) : 0;
                    const tdsAmount = tdsEntry ? (parseFloat(tdsEntry.credit) || 0) : (invoiceReceipt ? (parseFloat(invoiceReceipt.tds) || 0) : 0);
                    const cnAmount = invoiceCN ? Math.abs(parseFloat(invoiceCN.totalAmount) || 0) : 0;
                    const discountAmount = discountEntry ? (parseFloat(discountEntry.credit) || 0) : 0;
                    const balanceAmount = Math.max(0, invoiceAmount - receivedAmount - tdsAmount - cnAmount - discountAmount);
                    partyTotalBalance += balanceAmount;
                  });
                  
                  return (
                    <React.Fragment key={party}>
                      {/* Party Header Row */}
                      <tr 
                        onClick={() => togglePartyExpansion(party)}
                        style={{ backgroundColor: '#1E3A5F', color: 'white', cursor: 'pointer', borderBottom: '1px solid #0F2744' }}
                      >
                        <td colSpan="3" style={{ padding: '10px 12px', fontWeight: '700', fontSize: '13px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                            <Users size={16} />
                            {party}
                            <span style={{ backgroundColor: '#2874A6', padding: '2px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '600' }}>
                              {partyInvoices.length} inv
                            </span>
                          </div>
                        </td>
                        <td colSpan="4" style={{ padding: '10px 12px' }}></td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '700', fontSize: '13px', backgroundColor: partyTotalBalance === 0 ? '#22C55E' : '#3B82F6' }}>
                          {partyTotalBalance === 0 ? '✅ Nil' : `Bal: ${formatCurrency(partyTotalBalance)}`}
                        </td>
                        <td colSpan="4" style={{ padding: '10px 12px' }}></td>
                      </tr>
                      
                      {/* Invoice Rows */}
                      {isExpanded && partyInvoices.map(inv => {
                        // Find receipt for this invoice
                        const invoiceReceipt = receipts.find(r => r.invoiceNo === inv.invoiceNo);
                        // Find credit note for this invoice
                        const invoiceCN = creditNotes.find(cn => cn.invoiceNo === inv.invoiceNo);
                        // Find TDS ledger entry for this invoice
                        const tdsEntry = ledgerEntries.find(e => e.invoiceNo === inv.invoiceNo && e.type === 'tds');
                        // Find discount ledger entry for this invoice
                        const discountEntry = ledgerEntries.find(e => e.invoiceNo === inv.invoiceNo && e.type === 'discount');
                        
                        // Calculate amounts
                        const invoiceAmount = inv.totalAmount || 0;
                        const receivedAmount = invoiceReceipt ? (parseFloat(invoiceReceipt.amount) || 0) : 0;
                        const tdsAmount = tdsEntry ? (parseFloat(tdsEntry.credit) || 0) : (invoiceReceipt ? (parseFloat(invoiceReceipt.tds) || 0) : 0);
                        const cnAmount = invoiceCN ? Math.abs(parseFloat(invoiceCN.totalAmount) || 0) : 0;
                        const discountAmount = discountEntry ? (parseFloat(discountEntry.credit) || 0) : 0;
                        const balanceAmount = Math.max(0, invoiceAmount - receivedAmount - tdsAmount - cnAmount - discountAmount);
                        
                        // Check if fully covered by CN (CN Cancelled scenario)
                        const isFullyCoveredByCN = cnAmount >= invoiceAmount && !invoiceReceipt;
                        
                        return (
                        <tr key={inv.invoiceNo} style={{ borderBottom: '1px solid #F1F5F9', backgroundColor: inv.invoiceType === 'Combined' ? '#FAF5FF' : (balanceAmount === 0 ? '#F0FDF4' : 'transparent') }}>
                          <td style={{ padding: '10px 12px 10px 36px', fontWeight: '700', color: inv.invoiceType === 'Combined' ? '#7C3AED' : '#2874A6' }}>{inv.invoiceNo}</td>
                          <td style={{ padding: '10px 12px' }}>{formatDate(inv.date)}</td>
                          <td style={{ padding: '10px 12px', textAlign: 'center' }}><StatusBadge status={inv.invoiceType} small /></td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '700' }}>{formatCurrency(invoiceAmount)}</td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '600', backgroundColor: '#F0FDF4', color: receivedAmount > 0 ? '#166534' : '#94A3B8' }}>{receivedAmount > 0 ? formatCurrency(receivedAmount) : '-'}</td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '600', backgroundColor: '#FEF3C7', color: tdsAmount > 0 ? '#92400E' : '#94A3B8' }}>{tdsAmount > 0 ? formatCurrency(tdsAmount) : '-'}</td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '600', backgroundColor: '#FEE2E2', color: cnAmount > 0 ? '#991B1B' : '#94A3B8' }}>{cnAmount > 0 ? formatCurrency(cnAmount) : '-'}</td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '700', backgroundColor: '#EFF6FF', color: balanceAmount > 0 ? '#1E40AF' : '#166534' }}>{balanceAmount === 0 ? '✅ Nil' : formatCurrency(balanceAmount)}</td>
                          <td style={{ padding: '10px 12px', textAlign: 'center' }}><StatusBadge status={inv.invoiceStatus} small /></td>
                          <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                            {isFullyCoveredByCN ? (
                              <span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '700', backgroundColor: '#FEE2E2', color: '#991B1B' }}>❌ Cancelled</span>
                            ) : invoiceReceipt ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}>
                                <button 
                                  onClick={() => viewReceipt(invoiceReceipt)}
                                  style={{ 
                                    padding: '4px 8px', 
                                    borderRadius: '12px', 
                                    fontSize: '10px', 
                                    fontWeight: '700', 
                                    backgroundColor: '#DCFCE7', 
                                    color: '#166534',
                                    border: 'none',
                                    cursor: 'pointer',
                                    textDecoration: 'underline'
                                  }}
                                  title="Click to view receipt"
                                >
                                  ✅ {invoiceReceipt.receiptNo}
                                </button>
                                {canEdit && (
                                  <button 
                                    onClick={() => handleDeleteReceipt(invoiceReceipt)}
                                    style={{ 
                                      padding: '2px 4px', 
                                      borderRadius: '4px', 
                                      fontSize: '10px', 
                                      backgroundColor: '#FEE2E2', 
                                      color: '#991B1B',
                                      border: 'none',
                                      cursor: 'pointer'
                                    }}
                                    title="Delete Receipt"
                                  >
                                    ✕
                                  </button>
                                )}
                              </div>
                            ) : (
                              <span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '600', backgroundColor: '#FEF3C7', color: '#92400E' }}>⏳ Pending</span>
                            )}
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                            {invoiceCN ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}>
                                <button 
                                  onClick={() => viewCreditNote(invoiceCN)}
                                  style={{ 
                                    padding: '4px 8px', 
                                    borderRadius: '12px', 
                                    fontSize: '10px', 
                                    fontWeight: '700', 
                                    backgroundColor: '#FEE2E2', 
                                    color: '#991B1B',
                                    border: 'none',
                                    cursor: 'pointer',
                                    textDecoration: 'underline'
                                  }}
                                  title="Click to view credit note"
                                >
                                  {invoiceCN.creditNoteNo}
                                </button>
                                {canEdit && (
                                  <button 
                                    onClick={() => handleDeleteCreditNote(invoiceCN)}
                                    style={{ 
                                      padding: '2px 4px', 
                                      borderRadius: '4px', 
                                      fontSize: '10px', 
                                      backgroundColor: '#FEE2E2', 
                                      color: '#991B1B',
                                      border: 'none',
                                      cursor: 'pointer'
                                    }}
                                    title="Delete Credit Note"
                                  >
                                    ✕
                                  </button>
                                )}
                              </div>
                            ) : (
                              <span style={{ color: '#94A3B8', fontSize: '11px' }}>-</span>
                            )}
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                            <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', flexWrap: 'wrap' }}>
                              {inv.isHistorical ? (
                                <>
                                  {/* Historical invoice actions */}
                                  {canEdit && !invoiceReceipt && (
                                    <ActionButton icon={Receipt} small variant="success" onClick={() => {
                                      // Create a compatible object for historical invoice
                                      const histObj = {
                                        invoiceNo: inv.invoiceNo,
                                        partyName: inv.partyName,
                                        invoiceDate: inv.date,
                                        invoiceTotalAmount: inv.totalAmount,
                                        invoiceStatus: 'Approved',
                                        mailingSent: 'Yes',
                                        invoiceType: 'Historical',
                                        isHistorical: true
                                      };
                                      openReceiptModal(histObj);
                                    }} title="Create Receipt" />
                                  )}
                                  {canEdit && !invoiceCN && (
                                    <ActionButton icon={FileText} small variant="primary" onClick={() => {
                                      const histObj = {
                                        invoiceNo: inv.invoiceNo,
                                        partyName: inv.partyName,
                                        invoiceDate: inv.date,
                                        invoiceTotalAmount: inv.totalAmount,
                                        invoiceStatus: 'Approved',
                                        isHistorical: true
                                      };
                                      openCreditNoteModal(histObj);
                                    }} title="Credit Note" />
                                  )}
                                </>
                              ) : (
                                <>
                                  {/* System invoice actions */}
                                  <ActionButton icon={Eye} small variant="brand" onClick={() => downloadInvoice(inv.campaigns[0])} title="View Invoice" />
                                  {canEdit && inv.invoiceStatus === 'Approved' && inv.mailingSent === 'Yes' && !invoiceReceipt && (
                                    <ActionButton icon={Receipt} small variant="success" onClick={() => openReceiptModal(inv.campaigns[0])} title="Create Receipt" />
                                  )}
                                  {canEdit && inv.invoiceStatus === 'Approved' && !invoiceCN && (
                                    <ActionButton icon={FileText} small variant="primary" onClick={() => openCreditNoteModal(inv.campaigns[0])} title="Credit Note" />
                                  )}
                                  {canEdit && (
                                    <ActionButton icon={Trash2} small variant="danger" onClick={() => openDeleteConfirm(inv.campaigns[0])} title="Delete Invoice" />
                                  )}
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                        );
                      })}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </Card>
      </div>
    );
  };

  // Generate Ledger PDF
  const generateLedgerPDF = () => {
    if (!selectedParty) {
      alert('Please select a party first');
      return;
    }
    
    // Use the same buildDetailedLedger logic
    const opening = openingBalances[selectedParty] || 0;
    
    // Get all invoices from masterData
    const partyInvoices = masterData.filter(r => 
      r.partyName === selectedParty && 
      r.invoiceGenerated && 
      r.invoiceStatus === 'Approved'
    );
    
    const invoiceMap = new Map();
    partyInvoices.forEach(row => {
      if (!invoiceMap.has(row.invoiceNo)) {
        invoiceMap.set(row.invoiceNo, {
          invoiceNo: row.invoiceNo,
          invoiceDate: row.invoiceDate,
          campaigns: [row],
          isFromMaster: true
        });
      } else {
        invoiceMap.get(row.invoiceNo).campaigns.push(row);
      }
    });
    
    // Get historical entries (excluding CNs)
    const historicalInvoices = ledgerEntries.filter(e => 
      e.partyName === selectedParty && e.isHistorical && e.type !== 'creditnote' && !e.vchNo?.toUpperCase().startsWith('CN')
    );
    
    // Get historical CNs
    const historicalCNs = ledgerEntries.filter(e => 
      e.partyName === selectedParty && e.isHistorical && (e.type === 'creditnote' || e.vchNo?.toUpperCase().startsWith('CN'))
    );
    
    const partyReceipts = receipts.filter(r => r.partyName === selectedParty);
    const systemCNs = creditNotes.filter(cn => cn.partyName === selectedParty);
    
    // Helper to extract year+suffix for matching (e.g., "2022-23/272" from "MB/2022-23/272" or "CN/2022-23/272")
    const getInvoiceYearSuffix = (vchNo) => {
      if (!vchNo) return '';
      const parts = vchNo.split('/');
      if (parts.length >= 3) {
        // Return year + suffix: "2022-23/272"
        return parts.slice(1).join('/');
      } else if (parts.length === 2) {
        return parts.join('/');
      }
      return parts[parts.length - 1];
    };
    
    // Build CN map by year+suffix (not just suffix)
    const creditNoteByYearSuffix = new Map();
    systemCNs.forEach(cn => {
      // For system CNs, use the original invoiceNo for matching
      const key = getInvoiceYearSuffix(cn.invoiceNo);
      if (key && !creditNoteByYearSuffix.has(key)) {
        creditNoteByYearSuffix.set(key, { ...cn, isSystemCN: true });
      }
    });
    historicalCNs.forEach(cn => {
      const key = getInvoiceYearSuffix(cn.vchNo);
      if (key && !creditNoteByYearSuffix.has(key)) {
        creditNoteByYearSuffix.set(key, { ...cn, isHistoricalCN: true });
      }
    });
    
    // Build PDF rows
    let pdfRows = [];
    let totalDebit = 0;
    let totalCredit = 0;
    let totalReceived = 0;
    let totalTds = 0;
    let runningBalance = opening;
    const processedCNKeys = new Set();
    
    // Opening balance
    if (opening !== 0) {
      totalDebit += opening > 0 ? opening : 0;
      totalCredit += opening < 0 ? Math.abs(opening) : 0;
      pdfRows.push({
        date: '',
        particular: 'Opening Balance',
        vchType: '',
        vchNo: '',
        debit: opening > 0 ? opening : 0,
        credit: opening < 0 ? Math.abs(opening) : 0,
        receiptDate: '',
        amountReceived: 0,
        tds: 0,
        balance: opening,
        status: '',
        isMain: true,
        isOpening: true
      });
    }
    
    // Combine all invoice entries
    const allInvoiceEntries = [];
    
    Array.from(invoiceMap.values())
      .filter(inv => {
        const invDate = new Date(inv.invoiceDate);
        return invDate >= new Date(ledgerPeriod.fromDate) && invDate <= new Date(ledgerPeriod.toDate);
      })
      .forEach(inv => {
        allInvoiceEntries.push({ ...inv, entryType: 'invoice', sortDate: inv.invoiceDate });
      });
    
    historicalInvoices
      .filter(e => {
        if (!e.date) return false;
        const entryDate = new Date(e.date);
        return entryDate >= new Date(ledgerPeriod.fromDate) && entryDate <= new Date(ledgerPeriod.toDate);
      })
      .forEach(e => {
        allInvoiceEntries.push({ ...e, entryType: 'invoice', sortDate: e.date });
      });
    
    // Sort by date
    allInvoiceEntries.sort((a, b) => new Date(a.sortDate) - new Date(b.sortDate));
    
    // Process entries
    allInvoiceEntries.forEach(entry => {
      if (entry.isFromMaster) {
        const inv = entry;
        let baseAmount = 0;
        inv.campaigns.forEach(c => baseAmount += parseFloat(c.invoiceAmount) || 0);
        
        const isSameState = inv.campaigns[0]?.statePartyDetails?.toUpperCase().includes('MAHARASHTRA');
        const cgst = isSameState ? baseAmount * 0.09 : 0;
        const sgst = isSameState ? baseAmount * 0.09 : 0;
        const igst = isSameState ? 0 : baseAmount * 0.18;
        const totalAmount = baseAmount + cgst + sgst + igst;
        
        const invYearSuffix = getInvoiceYearSuffix(inv.invoiceNo);
        const matchingCN = creditNoteByYearSuffix.get(invYearSuffix);
        const hasCN = !!matchingCN;
        
        const invoiceReceipt = partyReceipts.find(r => r.invoiceNo === inv.invoiceNo);
        runningBalance += totalAmount;
        totalDebit += totalAmount;
        
        let amountReceived = 0, tdsReceived = 0, receiptDate = '', paymentStatus = hasCN ? '' : 'Pending';
        if (invoiceReceipt) {
          paymentStatus = 'Received';
          amountReceived = invoiceReceipt.amount || 0;
          tdsReceived = invoiceReceipt.tds || 0;
          receiptDate = invoiceReceipt.date;
          totalReceived += amountReceived;
          totalTds += tdsReceived;
          runningBalance -= (amountReceived + tdsReceived + (invoiceReceipt.discount || 0));
        }
        
        pdfRows.push({
          date: inv.invoiceDate,
          particular: selectedParty,
          vchType: 'Sales',
          vchNo: inv.invoiceNo,
          debit: totalAmount,
          credit: 0,
          receiptDate: receiptDate,
          amountReceived: amountReceived,
          tds: tdsReceived,
          balance: hasCN ? '-' : (paymentStatus === 'Received' ? 0 : totalAmount - amountReceived - tdsReceived),
          status: paymentStatus,
          isMain: true,
          hasCN: hasCN
        });
        
        // Sub-rows
        pdfRows.push({ particular: 'PROMOTIONAL TRADE EMAILER' + (inv.campaigns.length > 1 ? 'S' : ''), credit: baseAmount, isMain: false, hasCN: hasCN });
        if (isSameState) {
          pdfRows.push({ particular: 'CGST', credit: cgst, isMain: false, hasCN: hasCN });
          pdfRows.push({ particular: 'SGST', credit: sgst, isMain: false, hasCN: hasCN });
        } else {
          pdfRows.push({ particular: 'IGST', credit: igst, isMain: false, hasCN: hasCN });
        }
        
        // Add CN right after invoice
        if (matchingCN && !processedCNKeys.has(invYearSuffix)) {
          processedCNKeys.add(invYearSuffix);
          // CN amounts may be negative, use Math.abs for display
          const cnAmount = Math.abs(matchingCN.totalAmount || matchingCN.credit || 0);
          runningBalance -= cnAmount;
          totalCredit += cnAmount;
          
          pdfRows.push({
            date: matchingCN.date,
            particular: selectedParty,
            vchType: 'Credit Note',
            vchNo: matchingCN.creditNoteNo || matchingCN.vchNo,
            debit: 0,
            credit: cnAmount,
            receiptDate: '',
            amountReceived: 0,
            tds: 0,
            balance: '-',
            status: '',
            isMain: true,
            isCreditNote: true,
            hasCN: true
          });
          
          // CN sub-rows
          const cnBase = Math.abs(matchingCN.amount) || cnAmount / 1.18;
          const cnTax = Math.abs(matchingCN.gst) || (cnAmount - cnBase);
          pdfRows.push({ particular: 'PROMOTIONAL TRADE EMAILER', credit: cnBase, isMain: false, isCreditNote: true, hasCN: true });
          pdfRows.push({ particular: matchingCN.gstType || (isSameState ? 'CGST + SGST' : 'IGST'), credit: cnTax, isMain: false, isCreditNote: true, hasCN: true });
        }
      } else if (entry.isHistorical) {
        const debit = entry.debit || 0;
        const credit = entry.credit || 0;
        
        const invYearSuffix = getInvoiceYearSuffix(entry.vchNo);
        const matchingCN = creditNoteByYearSuffix.get(invYearSuffix);
        const hasCN = !!matchingCN;
        
        runningBalance += debit - credit;
        totalDebit += debit;
        totalCredit += credit;
        
        pdfRows.push({
          date: entry.date,
          particular: entry.particulars || selectedParty,
          vchType: entry.vchType || 'Sales',
          vchNo: entry.vchNo,
          debit: debit,
          credit: credit,
          receiptDate: entry.receiptDate || '',
          amountReceived: entry.amountReceived || 0,
          tds: entry.tdsReceived || 0,
          balance: hasCN ? '-' : (debit - (entry.amountReceived || 0) - (entry.tdsReceived || 0)),
          status: hasCN ? '' : (entry.paymentStatus || ''),
          isMain: true,
          isHistorical: true,
          hasCN: hasCN
        });
        
        // Historical sub-rows
        if (entry.subRows && entry.subRows.length > 0) {
          entry.subRows.forEach(sub => {
            pdfRows.push({ particular: sub.particular, debit: sub.debit, credit: sub.credit, isMain: false, hasCN: hasCN });
          });
        }
        
        // Add CN right after historical invoice
        if (matchingCN && !processedCNKeys.has(invYearSuffix)) {
          processedCNKeys.add(invYearSuffix);
          // CN amounts may be negative, use Math.abs for display
          const cnAmount = Math.abs(matchingCN.totalAmount || matchingCN.credit || 0);
          runningBalance -= cnAmount;
          totalCredit += cnAmount;
          
          pdfRows.push({
            date: matchingCN.date,
            particular: selectedParty,
            vchType: 'Credit Note',
            vchNo: matchingCN.creditNoteNo || matchingCN.vchNo,
            debit: 0,
            credit: cnAmount,
            receiptDate: '',
            amountReceived: 0,
            tds: 0,
            balance: '-',
            status: '',
            isMain: true,
            isCreditNote: true,
            hasCN: true
          });
          
          if (matchingCN.subRows && matchingCN.subRows.length > 0) {
            matchingCN.subRows.forEach(sub => {
              pdfRows.push({ particular: sub.particular, credit: Math.abs(sub.credit || 0), isMain: false, isCreditNote: true, hasCN: true });
            });
          }
        }
      }
    });
    
    // Closing balance = sum of individual balance values (not runningBalance)
    const closingBalance = pdfRows.reduce((sum, row) => {
      if (row.isMain && typeof row.balance === 'number' && row.balance > 0) {
        return sum + row.balance;
      }
      return sum;
    }, 0);
    
    // Get party address and GSTIN from partiesForLedger (includes Party Master data)
    const partyInfo = partiesForLedger.find(p => p.partyName === selectedParty) || {};
    const partyRow = masterData.find(r => r.partyName === selectedParty);
    const partyAddress = partyRow?.statePartyDetails || partyInfo.state || '';
    // Get GSTIN - first try partiesForLedger, then fallback to getPartyGstin
    const partyGstin = partyInfo.gstin || getPartyGstin(selectedParty, partyAddress);
    
    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Ledger Account - ${selectedParty}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 11px; padding: 20px; }
    .header { text-align: center; margin-bottom: 15px; }
    .firm-name { font-size: 18px; font-weight: bold; color: #1E293B; }
    .firm-address { font-size: 10px; color: #666; margin-top: 2px; }
    .party-section { text-align: center; margin: 15px 0; padding: 10px; border: 1px solid #ddd; background: #f9f9f9; }
    .party-name { font-size: 14px; font-weight: bold; }
    .ledger-title { font-size: 11px; color: #666; }
    .party-address { font-size: 10px; color: #666; margin-top: 5px; }
    .party-gstin { font-size: 10px; color: #1a5276; margin-top: 3px; font-weight: 600; }
    .period { text-align: center; font-size: 11px; margin: 10px 0; font-weight: bold; }
    .totals { display: flex; justify-content: space-around; background: #e8f4fd; padding: 8px; margin-bottom: 10px; font-size: 10px; border: 1px solid #ccc; }
    .totals div { text-align: center; }
    .totals .label { color: #666; }
    .totals .value { font-weight: bold; font-size: 11px; }
    .closing-balance { text-align: center; background: #1E293B; color: white; padding: 10px; margin-bottom: 10px; font-size: 14px; font-weight: bold; }
    table { width: 100%; border-collapse: collapse; font-size: 10px; }
    th { background: #f0f0f0; border: 1px solid #ccc; padding: 6px 4px; text-align: left; font-weight: bold; }
    td { border: 1px solid #ddd; padding: 5px 4px; }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .main-row { background: #fff; }
    .main-row-cn { background: #fffbeb; }
    .sub-row { background: #fafafa; }
    .sub-row-cn { background: #fffbeb; }
    .sub-row td { padding-left: 20px; color: #666; font-size: 9px; }
    .opening-row { background: #fef3c7; font-weight: bold; }
    .credit-note-row { background: #fffbeb; }
    .status-received { background: #dcfce7; color: #166534; padding: 2px 6px; border-radius: 3px; font-size: 9px; }
    .status-pending { background: #fef3c7; color: #92400e; padding: 2px 6px; border-radius: 3px; font-size: 9px; }
    .debit { color: #dc2626; }
    .credit { color: #059669; }
    @media print { 
      body { padding: 10px; } 
      @page { size: landscape; margin: 10mm; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="firm-name">${companyConfig.name}</div>
    <div class="firm-address">${companyConfig.address}</div>
    <div class="firm-address">${companyConfig.addressLine2}, ${companyConfig.city}</div>
    <div class="firm-address">E-Mail: ${companyConfig.email}</div>
  </div>
  
  <div class="party-section">
    <div class="party-name">${selectedParty}</div>
    <div class="ledger-title">Ledger Account</div>
    ${partyAddress ? `<div class="party-address">${partyAddress}</div>` : ''}
    ${partyGstin ? `<div class="party-gstin">GSTIN: ${partyGstin}</div>` : ''}
  </div>
  
  <div class="period">${formatDate(ledgerPeriod.fromDate)} to ${formatDate(ledgerPeriod.toDate)}</div>
  
  <div class="closing-balance">
    Closing Balance: ${formatCurrencyShort(Math.abs(closingBalance))} ${closingBalance > 0 ? '(Dr)' : closingBalance < 0 ? '(Cr)' : ''}
  </div>
  
  <div class="totals">
    <div><div class="label">Debit</div><div class="value">${formatCurrencyShort(totalDebit)}</div></div>
    <div><div class="label">Credit</div><div class="value">${formatCurrencyShort(totalCredit)}</div></div>
    <div><div class="label">Amount Received</div><div class="value credit">${formatCurrencyShort(totalReceived)}</div></div>
    <div><div class="label">TDS Received</div><div class="value">${formatCurrencyShort(totalTds)}</div></div>
  </div>
  
  <table>
    <thead>
      <tr>
        <th style="width:65px">Date</th>
        <th>Particular</th>
        <th style="width:70px" class="text-center">Vch Type</th>
        <th style="width:100px">Vch No.</th>
        <th style="width:80px" class="text-right">Debit</th>
        <th style="width:80px" class="text-right">Credit</th>
        <th style="width:70px" class="text-center">Date of Receipt</th>
        <th style="width:85px" class="text-right">Amount Received</th>
        <th style="width:70px" class="text-right">TDS Received</th>
        <th style="width:75px" class="text-right">Balance</th>
        <th style="width:70px" class="text-center">Payment Status</th>
      </tr>
    </thead>
    <tbody>
      ${pdfRows.map(row => row.isMain ? `
        <tr class="${row.isOpening ? 'opening-row' : (row.hasCN || row.isCreditNote ? 'main-row-cn' : 'main-row')}">
          <td>${row.date ? formatDate(row.date) : ''}</td>
          <td style="font-weight:600">${row.particular}</td>
          <td class="text-center">${row.vchType || ''}</td>
          <td style="color:#2874A6;font-weight:600">${row.vchNo || ''}</td>
          <td class="text-right">${row.debit > 0 ? formatCurrencyShort(row.debit) : ''}</td>
          <td class="text-right" style="color:#DC2626">${row.credit > 0 ? formatCurrencyShort(row.credit) : ''}</td>
          <td class="text-center">${row.receiptDate ? formatDate(row.receiptDate) : ''}</td>
          <td class="text-right credit">${row.amountReceived > 0 ? formatCurrencyShort(row.amountReceived) : ''}</td>
          <td class="text-right">${row.tds > 0 ? formatCurrencyShort(row.tds) : ''}</td>
          <td class="text-right">${row.balance === '-' ? '-' : (row.balance > 0 ? formatCurrencyShort(row.balance) : '')}</td>
          <td class="text-center">${row.status ? `<span class="${row.status === 'Received' ? 'status-received' : 'status-pending'}">${row.status}</span>` : ''}</td>
        </tr>
      ` : `
        <tr class="${row.hasCN || row.isCreditNote ? 'sub-row-cn' : 'sub-row'}">
          <td></td>
          <td style="padding-left:20px;color:#666">${row.particular}</td>
          <td></td>
          <td></td>
          <td class="text-right">${row.debit ? formatCurrencyShort(row.debit) : ''}</td>
          <td class="text-right">${row.credit ? formatCurrencyShort(row.credit) : ''}</td>
          <td></td>
          <td></td>
          <td></td>
          <td></td>
          <td></td>
        </tr>
      `).join('')}
    </tbody>
  </table>
  
  <script>window.onload = function() { window.print(); }</script>
</body>
</html>`;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const renderLedgers = () => {
    // Calculate closing balance as sum of individual invoice balances
    const getPartyBalance = (party) => {
      const opening = openingBalances[party] || 0;
      
      // Get all invoices for this party
      const partyInvoices = masterData.filter(r => 
        r.partyName === party && 
        r.invoiceGenerated && 
        r.invoiceStatus === 'Approved'
      );
      
      // Group by invoice number
      const invoiceMap = new Map();
      partyInvoices.forEach(row => {
        if (!invoiceMap.has(row.invoiceNo)) {
          invoiceMap.set(row.invoiceNo, { 
            invoiceNo: row.invoiceNo, 
            campaigns: [row],
            totalAmount: parseFloat(row.invoiceTotalAmount) || 0
          });
        } else {
          invoiceMap.get(row.invoiceNo).campaigns.push(row);
        }
      });
      
      // Get receipts and credit notes for this party
      const partyReceipts = receipts.filter(r => r.partyName === party);
      const partyCreditNotes = creditNotes.filter(cn => cn.partyName === party);
      
      // Historical invoices
      const historicalInvoices = ledgerEntries.filter(e => 
        e.partyName === party && e.isHistorical && e.type !== 'creditnote' && !e.vchNo?.toUpperCase().startsWith('CN')
      );
      
      // Historical CNs
      const historicalCNs = ledgerEntries.filter(e => 
        e.partyName === party && e.isHistorical && (e.type === 'creditnote' || e.vchNo?.toUpperCase().startsWith('CN'))
      );
      
      // Helper to extract year+suffix for matching (e.g., "2022-23/272" from "MB/2022-23/272")
      const getInvoiceYearSuffix = (vchNo) => {
        if (!vchNo) return '';
        const parts = vchNo.split('/');
        if (parts.length >= 3) {
          return parts.slice(1).join('/');
        } else if (parts.length === 2) {
          return parts.join('/');
        }
        return parts[parts.length - 1];
      };
      
      // Build CN map by year+suffix
      const creditNoteByYearSuffix = new Map();
      partyCreditNotes.forEach(cn => {
        // For system CNs, use the original invoiceNo for matching
        const key = getInvoiceYearSuffix(cn.invoiceNo);
        if (key && !creditNoteByYearSuffix.has(key)) {
          creditNoteByYearSuffix.set(key, cn);
        }
      });
      historicalCNs.forEach(cn => {
        const key = getInvoiceYearSuffix(cn.vchNo);
        if (key && !creditNoteByYearSuffix.has(key)) {
          creditNoteByYearSuffix.set(key, cn);
        }
      });
      
      let totalBalance = 0;
      
      // Add opening balance if positive
      if (opening > 0) totalBalance += opening;
      
      // Calculate balance for each new system invoice
      Array.from(invoiceMap.values()).forEach(inv => {
        const totalAmount = inv.totalAmount; // Use actual invoiceTotalAmount
        
        const invYearSuffix = getInvoiceYearSuffix(inv.invoiceNo);
        const matchingCN = creditNoteByYearSuffix.get(invYearSuffix);
        // CN amounts may be negative, use Math.abs to get positive value for comparison
        const cnAmount = matchingCN ? Math.abs(parseFloat(matchingCN.totalAmount) || parseFloat(matchingCN.credit) || 0) : 0;
        const isFullyCoveredByCN = matchingCN && cnAmount >= totalAmount;
        
        if (!isFullyCoveredByCN) {
          // Calculate remaining balance after CN (if partial)
          let remainingAfterCN = matchingCN ? totalAmount - cnAmount : totalAmount;
          
          const invoiceReceipt = partyReceipts.find(r => r.invoiceNo === inv.invoiceNo);
          if (invoiceReceipt) {
            const balanceAfterReceipt = remainingAfterCN - (parseFloat(invoiceReceipt.amount) || 0) - (parseFloat(invoiceReceipt.tds) || 0) - (parseFloat(invoiceReceipt.discount) || 0);
            if (balanceAfterReceipt > 0) totalBalance += balanceAfterReceipt;
          } else {
            if (remainingAfterCN > 0) totalBalance += remainingAfterCN;
          }
        }
      });
      
      // Calculate balance for historical invoices
      historicalInvoices.forEach(entry => {
        const invYearSuffix = getInvoiceYearSuffix(entry.vchNo);
        const matchingCN = creditNoteByYearSuffix.get(invYearSuffix);
        // CN amounts may be negative, use Math.abs to get positive value for comparison
        const cnAmount = matchingCN ? Math.abs(parseFloat(matchingCN.totalAmount) || parseFloat(matchingCN.credit) || parseFloat(matchingCN.debit) || 0) : 0;
        const debit = parseFloat(entry.debit) || 0;
        const isFullyCoveredByCN = matchingCN && cnAmount >= debit;
        
        if (!isFullyCoveredByCN) {
          let remainingAfterCN = matchingCN ? debit - cnAmount : debit;
          const received = parseFloat(entry.amountReceived) || 0;
          const tds = parseFloat(entry.tdsReceived) || 0;
          const balance = remainingAfterCN - received - tds;
          if (balance > 0) totalBalance += balance;
        }
      });
      
      return totalBalance;
    };
    
    // Filter parties by search (search in party name and state)
    const filteredParties = partiesForLedger.filter(p => 
      p.partyName.toLowerCase().includes(ledgerPartySearch.toLowerCase()) ||
      (p.state && p.state.toLowerCase().includes(ledgerPartySearch.toLowerCase()))
    );
    
    // Get party info from partiesForLedger
    const getPartyInfo = (partyName) => {
      return partiesForLedger.find(p => p.partyName === partyName) || { state: '', gstin: '' };
    };
    
    // Get party address from masterData or partiesForLedger
    const getPartyAddress = (partyName) => {
      const partyRow = masterData.find(r => r.partyName === partyName);
      if (partyRow?.statePartyDetails) return partyRow.statePartyDetails;
      const partyInfo = partiesForLedger.find(p => p.partyName === partyName);
      return partyInfo?.state || '';
    };
    
    // Get party GSTIN for selected party
    const getSelectedPartyGstin = (partyName) => {
      // First try from partiesForLedger (includes Party Master data)
      const partyInfo = partiesForLedger.find(p => p.partyName === partyName);
      if (partyInfo?.gstin) return partyInfo.gstin;
      
      // Fallback: try matching with state from masterData
      const partyRow = masterData.find(r => r.partyName === partyName);
      if (partyRow) {
        return getPartyGstin(partyName, partyRow.statePartyDetails);
      }
      return '';
    };
    
    // Build detailed ledger data for selected party
    const buildDetailedLedger = () => {
      if (!selectedParty) return { entries: [], totals: { debit: 0, credit: 0, received: 0, tds: 0, balance: 0 } };
      
      const opening = openingBalances[selectedParty] || 0;
      
      // Helper to extract year+suffix for matching (e.g., "2022-23/272" from "MB/2022-23/272")
      const getInvoiceYearSuffix = (vchNo) => {
        if (!vchNo) return '';
        const parts = vchNo.split('/');
        if (parts.length >= 3) {
          return parts.slice(1).join('/');
        } else if (parts.length === 2) {
          return parts.join('/');
        }
        return parts[parts.length - 1];
      };
      
      // Get all invoices for this party from masterData (new system)
      const partyInvoices = masterData.filter(r => 
        r.partyName === selectedParty && 
        r.invoiceGenerated && 
        r.invoiceStatus === 'Approved'
      );
      
      // Group by invoice number
      const invoiceMap = new Map();
      partyInvoices.forEach(row => {
        if (!invoiceMap.has(row.invoiceNo)) {
          invoiceMap.set(row.invoiceNo, {
            invoiceNo: row.invoiceNo,
            invoiceDate: row.invoiceDate,
            invoiceType: row.invoiceType,
            combinationCode: row.combinationCode,
            receiptStatus: row.receiptStatus,
            receiptNo: row.receiptNo,
            receiptDate: row.receiptDate,
            creditNoteNo: row.creditNoteNo,
            campaigns: [row],
            isFromMaster: true
          });
        } else {
          invoiceMap.get(row.invoiceNo).campaigns.push(row);
        }
      });
      
      // Get historical entries for this party (excluding CN type - they'll be matched separately)
      const historicalInvoices = ledgerEntries.filter(e => 
        e.partyName === selectedParty && e.isHistorical && e.type !== 'creditnote' && !e.vchNo?.toUpperCase().startsWith('CN')
      );
      
      // Get historical credit notes
      const historicalCNs = ledgerEntries.filter(e => 
        e.partyName === selectedParty && e.isHistorical && (e.type === 'creditnote' || e.vchNo?.toUpperCase().startsWith('CN'))
      );
      
      // Get receipts for this party
      const partyReceipts = receipts.filter(r => r.partyName === selectedParty);
      
      // Get credit notes from creditNotes state only (not ledgerEntries to avoid duplicates)
      const systemCNs = creditNotes.filter(cn => cn.partyName === selectedParty);
      
      // Create a map of ALL credit notes by year+suffix (combine system + historical)
      const creditNoteByYearSuffix = new Map();
      
      // Add system credit notes - use invoiceNo for matching
      systemCNs.forEach(cn => {
        const key = getInvoiceYearSuffix(cn.invoiceNo);
        if (key && !creditNoteByYearSuffix.has(key)) {
          creditNoteByYearSuffix.set(key, { ...cn, isSystemCN: true });
        }
      });
      
      // Add historical credit notes
      historicalCNs.forEach(cn => {
        const key = getInvoiceYearSuffix(cn.vchNo);
        if (key && !creditNoteByYearSuffix.has(key)) {
          creditNoteByYearSuffix.set(key, { ...cn, isHistoricalCN: true });
        }
      });
      
      // Build ledger entries
      const entries = [];
      let runningBalance = opening;
      let totalDebit = 0;
      let totalCredit = 0;
      let totalReceived = 0;
      let totalTds = 0;
      const processedCNKeys = new Set();
      
      // Add opening balance if exists
      if (opening !== 0) {
        entries.push({
          id: 'opening',
          date: '',
          particular: 'Opening Balance',
          vchType: '',
          vchNo: '',
          debit: opening > 0 ? opening : 0,
          credit: opening < 0 ? Math.abs(opening) : 0,
          receiptDate: '',
          amountReceived: 0,
          tdsReceived: 0,
          balance: opening,
          paymentStatus: '',
          isOpening: true,
          subRows: []
        });
        totalDebit += opening > 0 ? opening : 0;
        totalCredit += opening < 0 ? Math.abs(opening) : 0;
      }
      
      // Combine all invoice entries and sort by date
      const allInvoiceEntries = [];
      
      // Add invoices from masterData
      Array.from(invoiceMap.values())
        .filter(inv => {
          const invDate = new Date(inv.invoiceDate);
          const fromDate = new Date(ledgerPeriod.fromDate);
          const toDate = new Date(ledgerPeriod.toDate);
          return invDate >= fromDate && invDate <= toDate;
        })
        .forEach(inv => {
          allInvoiceEntries.push({ ...inv, entryType: 'invoice', sortDate: inv.invoiceDate });
        });
      
      // Add historical invoices
      historicalInvoices
        .filter(e => {
          if (!e.date) return false;
          const entryDate = new Date(e.date);
          const fromDate = new Date(ledgerPeriod.fromDate);
          const toDate = new Date(ledgerPeriod.toDate);
          return entryDate >= fromDate && entryDate <= toDate;
        })
        .forEach(e => {
          allInvoiceEntries.push({ ...e, entryType: e.type || 'invoice', sortDate: e.date });
        });
      
      // Sort all invoice entries by date
      allInvoiceEntries.sort((a, b) => new Date(a.sortDate) - new Date(b.sortDate));
      
      // Process each invoice entry and add its CN right after
      allInvoiceEntries.forEach(entry => {
        if (entry.isFromMaster) {
          // Process invoice from masterData
          const inv = entry;
          let baseAmount = 0;
          inv.campaigns.forEach(c => {
            baseAmount += parseFloat(c.invoiceAmount) || 0;
          });
          
          const isSameState = inv.campaigns[0]?.statePartyDetails?.toUpperCase().includes('MAHARASHTRA');
          const cgst = isSameState ? baseAmount * 0.09 : 0;
          const sgst = isSameState ? baseAmount * 0.09 : 0;
          const igst = isSameState ? 0 : baseAmount * 0.18;
          const totalAmount = baseAmount + cgst + sgst + igst;
          
          // Check for matching credit note by year+suffix
          const invYearSuffix = getInvoiceYearSuffix(inv.invoiceNo);
          const matchingCN = creditNoteByYearSuffix.get(invYearSuffix);
          // CN amounts may be negative, use Math.abs to get positive value for comparison
          const cnAmount = matchingCN ? Math.abs(matchingCN.totalAmount || matchingCN.credit || 0) : 0;
          const hasCN = !!matchingCN;
          const isFullyCoveredByCN = hasCN && cnAmount >= totalAmount;
          const partialCNBalance = hasCN && !isFullyCoveredByCN ? totalAmount - cnAmount : 0;
          
          // Get receipt info for this invoice
          const invoiceReceipt = partyReceipts.find(r => r.invoiceNo === inv.invoiceNo);
          
          runningBalance += totalAmount;
          totalDebit += totalAmount;
          
          // Sub-rows for base amount and tax
          const subRows = [
            { particular: 'PROMOTIONAL TRADE EMAILER' + (inv.campaigns.length > 1 ? 'S' : ''), credit: baseAmount },
          ];
          
          if (isSameState) {
            subRows.push({ particular: 'CGST', credit: cgst });
            subRows.push({ particular: 'SGST', credit: sgst });
          } else {
            subRows.push({ particular: 'IGST', credit: igst });
          }
          
          // Determine payment status
          let paymentStatus = '';
          let amountReceived = 0;
          let tdsReceived = 0;
          let receiptDate = '';
          let balanceAmount = totalAmount;
          
          if (invoiceReceipt) {
            paymentStatus = 'Received';
            amountReceived = invoiceReceipt.amount || 0;
            tdsReceived = invoiceReceipt.tds || 0;
            receiptDate = invoiceReceipt.date;
            totalReceived += amountReceived;
            totalTds += tdsReceived;
            balanceAmount = totalAmount - amountReceived - tdsReceived - (invoiceReceipt.discount || 0);
            runningBalance -= (amountReceived + tdsReceived + (invoiceReceipt.discount || 0));
          } else if (inv.receiptStatus === 'Received') {
            paymentStatus = 'Received';
            balanceAmount = 0;
          } else if (isFullyCoveredByCN) {
            // CN fully covers invoice - no payment needed
            paymentStatus = 'CN Closed';
            balanceAmount = 0;
          } else if (hasCN && partialCNBalance > 0) {
            // Partial CN - still pending for remaining amount
            paymentStatus = 'Partial CN';
            balanceAmount = partialCNBalance;
          } else {
            paymentStatus = 'Pending';
          }
          
          // Add invoice entry
          entries.push({
            id: inv.invoiceNo,
            date: inv.invoiceDate,
            particular: selectedParty,
            vchType: 'Sales',
            vchNo: inv.invoiceNo,
            debit: totalAmount,
            credit: 0,
            receiptDate: receiptDate,
            amountReceived: amountReceived,
            tdsReceived: tdsReceived,
            balance: isFullyCoveredByCN ? '-' : (balanceAmount > 0 ? balanceAmount : 0),
            paymentStatus: paymentStatus,
            isInvoice: true,
            hasCN: hasCN,
            subRows: subRows
          });
          
          // Add credit note entry RIGHT AFTER invoice if exists
          if (matchingCN && !processedCNKeys.has(invYearSuffix)) {
            processedCNKeys.add(invYearSuffix);
            // CN amounts may be negative, use Math.abs for display
            const cnAmountDisplay = Math.abs(matchingCN.totalAmount || matchingCN.credit || 0);
            runningBalance -= cnAmountDisplay;
            totalCredit += cnAmountDisplay;
            
            // CN sub-rows
            const cnSubRows = [];
            if (matchingCN.amount) {
              cnSubRows.push({ particular: 'PROMOTIONAL TRADE EMAILER', credit: Math.abs(matchingCN.amount) });
            }
            if (matchingCN.gst) {
              cnSubRows.push({ particular: matchingCN.gstType || (isSameState ? 'CGST + SGST' : 'IGST'), credit: Math.abs(matchingCN.gst) });
            }
            // If no breakdown, calculate from total
            if (cnSubRows.length === 0 && cnAmountDisplay > 0) {
              const baseAmt = cnAmountDisplay / 1.18;
              const taxAmt = cnAmountDisplay - baseAmt;
              cnSubRows.push({ particular: 'PROMOTIONAL TRADE EMAILER', credit: baseAmt });
              cnSubRows.push({ particular: isSameState ? 'CGST + SGST' : 'IGST', credit: taxAmt });
            }
            
            entries.push({
              id: matchingCN.id || matchingCN.creditNoteNo || `cn-${invYearSuffix}`,
              date: matchingCN.date,
              particular: selectedParty,
              vchType: 'Credit Note',
              vchNo: matchingCN.creditNoteNo || matchingCN.vchNo,
              debit: 0,
              credit: cnAmountDisplay,
              receiptDate: '',
              amountReceived: 0,
              tdsReceived: 0,
              balance: '-',
              paymentStatus: '',
              isCreditNote: true,
              hasCN: true,
              subRows: matchingCN.isHistoricalCN ? (matchingCN.subRows || cnSubRows) : cnSubRows
            });
          }
        } else if (entry.isHistorical) {
          // Process historical invoice entry
          const debit = entry.debit || 0;
          const credit = entry.credit || 0;
          
          // Check for matching credit note by year+suffix
          const invYearSuffix = getInvoiceYearSuffix(entry.vchNo);
          const matchingCN = creditNoteByYearSuffix.get(invYearSuffix);
          // CN amounts may be negative, use Math.abs to get positive value for comparison
          const cnAmount = matchingCN ? Math.abs(matchingCN.totalAmount || matchingCN.credit || 0) : 0;
          const hasCN = !!matchingCN;
          const isFullyCoveredByCN = hasCN && cnAmount >= debit;
          const partialCNBalance = hasCN && !isFullyCoveredByCN ? debit - cnAmount : 0;
          
          runningBalance += debit - credit;
          totalDebit += debit;
          totalCredit += credit;
          if (entry.amountReceived) totalReceived += entry.amountReceived;
          if (entry.tdsReceived) totalTds += entry.tdsReceived;
          
          // Use sub-rows from historical entry
          const subRows = entry.subRows || [];
          
          // Calculate balance
          let balanceAmount = debit - (entry.amountReceived || 0) - (entry.tdsReceived || 0);
          let paymentStatus = entry.paymentStatus || '';
          
          if (isFullyCoveredByCN) {
            balanceAmount = 0;
            paymentStatus = 'CN Closed';
          } else if (hasCN && partialCNBalance > 0) {
            balanceAmount = partialCNBalance - (entry.amountReceived || 0) - (entry.tdsReceived || 0);
            if (balanceAmount > 0) paymentStatus = 'Partial CN';
          }
          
          entries.push({
            id: entry.id,
            date: entry.date,
            particular: entry.particulars || selectedParty,
            vchType: entry.vchType || 'Sales',
            vchNo: entry.vchNo,
            debit: debit,
            credit: credit,
            receiptDate: entry.receiptDate || '',
            amountReceived: entry.amountReceived || 0,
            tdsReceived: entry.tdsReceived || 0,
            balance: isFullyCoveredByCN ? '-' : (balanceAmount > 0 ? balanceAmount : 0),
            paymentStatus: paymentStatus,
            isInvoice: true,
            isHistorical: true,
            hasCN: hasCN,
            subRows: subRows
          });
          
          // Add credit note entry RIGHT AFTER historical invoice if exists
          if (matchingCN && !processedCNKeys.has(invYearSuffix)) {
            processedCNKeys.add(invYearSuffix);
            runningBalance -= cnAmount;
            totalCredit += cnAmount;
            
            entries.push({
              id: matchingCN.id || matchingCN.creditNoteNo || matchingCN.vchNo || `cn-${invYearSuffix}`,
              date: matchingCN.date,
              particular: selectedParty,
              vchType: 'Credit Note',
              vchNo: matchingCN.creditNoteNo || matchingCN.vchNo,
              debit: 0,
              credit: cnAmount,
              receiptDate: '',
              amountReceived: 0,
              tdsReceived: 0,
              balance: '-',
              paymentStatus: '',
              isCreditNote: true,
              hasCN: true,
              subRows: matchingCN.subRows || []
            });
          }
        }
      });
      
      // Calculate closing balance as sum of individual balances
      const sumOfBalances = entries.reduce((sum, entry) => {
        if (typeof entry.balance === 'number' && entry.balance > 0) {
          return sum + entry.balance;
        }
        return sum;
      }, 0);
      
      return {
        entries,
        totals: {
          debit: totalDebit,
          credit: totalCredit,
          received: totalReceived,
          tds: totalTds,
          balance: sumOfBalances
        }
      };
    };
    
    const ledgerData = buildDetailedLedger();

    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '700', color: '#1E293B' }}>📚 Party Ledgers</h1>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {isDirector && <span style={{ padding: '8px 16px', backgroundColor: '#FEF3C7', borderRadius: '8px', fontSize: '13px', color: '#92400E', fontWeight: '600' }}>👁️ View Only</span>}
            {canEdit && <ActionButton icon={Upload} label="Import Historical" variant="brand" onClick={() => setShowHistoricalLedgerModal(true)} />}
            {canEdit && selectedParty && ledgerEntries.some(e => e.partyName === selectedParty && e.isHistorical) && (
              <ActionButton icon={Trash2} label="Clear Historical" variant="danger" onClick={handleClearHistoricalForParty} />
            )}
            {canEdit && <ActionButton icon={Plus} label="Opening Balance" variant="primary" onClick={() => setShowOpeningBalanceModal(true)} />}
          </div>
        </div>
        
        {/* Period Selector and Download */}
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', border: '1px solid #E2E8F0', padding: '14px 18px', marginBottom: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calendar size={18} color="#64748B" />
              <span style={{ fontSize: '13px', fontWeight: '700', color: '#475569' }}>Period:</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input 
                type="date" 
                value={ledgerPeriod.fromDate} 
                onChange={(e) => setLedgerPeriod(prev => ({ ...prev, fromDate: e.target.value }))}
                style={{ padding: '8px 12px', fontSize: '13px', border: '1.5px solid #E2E8F0', borderRadius: '8px' }}
              />
              <span style={{ color: '#64748B' }}>to</span>
              <input 
                type="date" 
                value={ledgerPeriod.toDate} 
                onChange={(e) => setLedgerPeriod(prev => ({ ...prev, toDate: e.target.value }))}
                style={{ padding: '8px 12px', fontSize: '13px', border: '1.5px solid #E2E8F0', borderRadius: '8px' }}
              />
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: '10px' }}>
              {selectedParty && (
                <ActionButton icon={Download} label="Download PDF" variant="brand" onClick={generateLedgerPDF} />
              )}
            </div>
          </div>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '16px' }}>
          <Card title="Parties" noPadding>
            {/* Party Search */}
            <div style={{ padding: '12px', borderBottom: '1px solid #E2E8F0' }}>
              <div style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                <input 
                  type="text" 
                  placeholder="Search party..." 
                  value={ledgerPartySearch} 
                  onChange={(e) => setLedgerPartySearch(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px 8px 32px', fontSize: '13px', border: '1.5px solid #E2E8F0', borderRadius: '8px', boxSizing: 'border-box' }}
                />
              </div>
            </div>
            <div style={{ maxHeight: '450px', overflowY: 'auto' }}>
              {filteredParties.length === 0 ? <div style={{ padding: '30px', textAlign: 'center', color: '#94A3B8', fontSize: '14px' }}>{ledgerPartySearch ? 'No matching parties' : 'No parties yet'}</div> : (
                filteredParties.map((partyInfo, idx) => {
                  const balance = getPartyBalance(partyInfo.partyName);
                  return (
                    <div key={`${partyInfo.partyName}-${partyInfo.state}-${idx}`} onClick={() => setSelectedParty(partyInfo.partyName)} style={{ padding: '14px 18px', borderBottom: '1px solid #F1F5F9', cursor: 'pointer', backgroundColor: selectedParty === partyInfo.partyName ? '#EFF6FF' : 'transparent', borderLeft: selectedParty === partyInfo.partyName ? '4px solid #2874A6' : '4px solid transparent' }}>
                      <div style={{ fontWeight: '600', fontSize: '14px', color: '#1E293B' }}>{partyInfo.partyName}</div>
                      {partyInfo.state && <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>📍 {partyInfo.state}</div>}
                      {partyInfo.gstin && <div style={{ fontSize: '10px', color: '#2874A6', marginTop: '1px' }}>GST: {partyInfo.gstin}</div>}
                      <div style={{ fontSize: '14px', color: balance > 0 ? '#DC2626' : '#059669', fontWeight: '700', marginTop: '4px' }}>{balance > 0 ? 'Dr. ' : 'Cr. '}{formatCurrency(Math.abs(balance))}</div>
                    </div>
                  );
                })
              )}
            </div>
          </Card>
          
          {/* Ledger Statement Card */}
          <Card title={selectedParty ? 'Ledger Account' : 'Select a Party'} noPadding>
            {selectedParty ? (
              <div style={{ fontSize: '12px' }}>
                {/* Header with company info */}
                <div style={{ textAlign: 'center', padding: '16px', borderBottom: '2px solid #1E3A5F', backgroundColor: '#F8FAFC' }}>
                  <div style={{ fontSize: '16px', fontWeight: '700', color: '#1E3A5F' }}>{companyConfig.name}</div>
                  <div style={{ fontSize: '11px', color: '#64748B', marginTop: '4px' }}>{companyConfig.address}</div>
                  <div style={{ fontSize: '11px', color: '#64748B' }}>{companyConfig.addressLine2}, {companyConfig.city}</div>
                  <div style={{ fontSize: '11px', color: '#64748B' }}>E-Mail: {companyConfig.email}</div>
                </div>
                
                {/* Party Info */}
                <div style={{ textAlign: 'center', padding: '12px', borderBottom: '1px solid #E2E8F0', backgroundColor: '#FFFFFF' }}>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: '#1E293B' }}>{selectedParty}</div>
                  <div style={{ fontSize: '11px', fontWeight: '600', color: '#64748B' }}>Ledger Account</div>
                  {getPartyAddress(selectedParty) && (
                    <div style={{ fontSize: '11px', color: '#64748B', marginTop: '4px' }}>📍 {getPartyAddress(selectedParty)}</div>
                  )}
                  {getSelectedPartyGstin(selectedParty) && (
                    <div style={{ fontSize: '11px', color: '#2874A6', marginTop: '3px', fontWeight: '600' }}>GSTIN: {getSelectedPartyGstin(selectedParty)}</div>
                  )}
                </div>
                
                {/* Period */}
                <div style={{ textAlign: 'center', padding: '8px', backgroundColor: '#F1F5F9', borderBottom: '1px solid #E2E8F0' }}>
                  <span style={{ fontSize: '11px', fontWeight: '600', color: '#475569' }}>
                    {formatDate(ledgerPeriod.fromDate)} to {formatDate(ledgerPeriod.toDate)}
                  </span>
                </div>
                
                {/* Closing Balance - Prominent Display */}
                <div style={{ 
                  backgroundColor: '#1E293B', 
                  color: 'white', 
                  padding: '12px 16px', 
                  display: 'flex', 
                  justifyContent: 'center', 
                  alignItems: 'center', 
                  gap: '12px',
                  borderBottom: '3px solid #F59E0B'
                }}>
                  <span style={{ fontSize: '14px', fontWeight: '600' }}>Closing Balance:</span>
                  <span style={{ 
                    fontSize: '18px', 
                    fontWeight: '700', 
                    color: ledgerData.totals.balance > 0 ? '#FCA5A5' : '#86EFAC'
                  }}>
                    {formatCurrencyShort(Math.abs(ledgerData.totals.balance))} {ledgerData.totals.balance > 0 ? '(Dr)' : ledgerData.totals.balance < 0 ? '(Cr)' : ''}
                  </span>
                </div>
                
                {/* Totals Row */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', backgroundColor: '#EFF6FF', borderBottom: '2px solid #2874A6', fontSize: '11px' }}>
                  <div style={{ padding: '8px', textAlign: 'center', borderRight: '1px solid #BFDBFE' }}>
                    <div style={{ color: '#64748B' }}>Debit</div>
                    <div style={{ fontWeight: '700', color: '#1E293B' }}>{formatCurrencyShort(ledgerData.totals.debit)}</div>
                  </div>
                  <div style={{ padding: '8px', textAlign: 'center', borderRight: '1px solid #BFDBFE' }}>
                    <div style={{ color: '#64748B' }}>Credit</div>
                    <div style={{ fontWeight: '700', color: '#DC2626' }}>{formatCurrencyShort(ledgerData.totals.credit)}</div>
                  </div>
                  <div style={{ padding: '8px', textAlign: 'center', borderRight: '1px solid #BFDBFE' }}>
                    <div style={{ color: '#64748B' }}>Amount Received</div>
                    <div style={{ fontWeight: '700', color: '#059669' }}>{formatCurrencyShort(ledgerData.totals.received)}</div>
                  </div>
                  <div style={{ padding: '8px', textAlign: 'center' }}>
                    <div style={{ color: '#64748B' }}>TDS Received</div>
                    <div style={{ fontWeight: '700', color: '#1E293B' }}>{formatCurrencyShort(ledgerData.totals.tds)}</div>
                  </div>
                </div>
                
                {/* Ledger Table */}
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', minWidth: '1000px' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '2px solid #E2E8F0' }}>
                        <th style={{ padding: '10px 8px', textAlign: 'left', fontWeight: '700', width: '75px', borderRight: '1px solid #E2E8F0' }}>Date</th>
                        <th style={{ padding: '10px 8px', textAlign: 'left', fontWeight: '700', minWidth: '150px', borderRight: '1px solid #E2E8F0' }}>Particular</th>
                        <th style={{ padding: '10px 8px', textAlign: 'center', fontWeight: '700', width: '80px', borderRight: '1px solid #E2E8F0' }}>Vch Type</th>
                        <th style={{ padding: '10px 8px', textAlign: 'left', fontWeight: '700', width: '110px', borderRight: '1px solid #E2E8F0' }}>Vch No.</th>
                        <th style={{ padding: '10px 8px', textAlign: 'right', fontWeight: '700', width: '90px', borderRight: '1px solid #E2E8F0' }}>Debit</th>
                        <th style={{ padding: '10px 8px', textAlign: 'right', fontWeight: '700', width: '90px', borderRight: '1px solid #E2E8F0' }}>Credit</th>
                        <th style={{ padding: '10px 8px', textAlign: 'center', fontWeight: '700', width: '85px', borderRight: '1px solid #E2E8F0' }}>Date of Receipt</th>
                        <th style={{ padding: '10px 8px', textAlign: 'right', fontWeight: '700', width: '90px', borderRight: '1px solid #E2E8F0' }}>Amount Received</th>
                        <th style={{ padding: '10px 8px', textAlign: 'right', fontWeight: '700', width: '80px', borderRight: '1px solid #E2E8F0' }}>TDS Received</th>
                        <th style={{ padding: '10px 8px', textAlign: 'right', fontWeight: '700', width: '85px', borderRight: '1px solid #E2E8F0' }}>Balance</th>
                        <th style={{ padding: '10px 8px', textAlign: 'center', fontWeight: '700', width: '75px', borderRight: '1px solid #E2E8F0' }}>Payment Status</th>
                        {canEdit && <th style={{ padding: '10px 8px', textAlign: 'center', fontWeight: '700', width: '50px' }}>Action</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {ledgerData.entries.length === 0 ? (
                        <tr><td colSpan={canEdit ? "12" : "11"} style={{ padding: '40px', textAlign: 'center', color: '#94A3B8' }}>No entries in selected period</td></tr>
                      ) : (
                        ledgerData.entries.map(entry => (
                          <React.Fragment key={entry.id}>
                            {/* Main Row */}
                            <tr style={{ 
                              backgroundColor: entry.isOpening ? '#FEF3C7' : (entry.hasCN || entry.isCreditNote ? '#FFFBEB' : '#FFFFFF'), 
                              borderBottom: '1px solid #E2E8F0',
                              borderLeft: entry.hasCN || entry.isCreditNote ? '4px solid #F59E0B' : 'none'
                            }}>
                              <td style={{ padding: '8px', borderRight: '1px solid #E2E8F0' }}>{entry.date ? formatDate(entry.date) : ''}</td>
                              <td style={{ padding: '8px', fontWeight: '600', color: entry.isCreditNote ? '#DC2626' : '#1E293B', borderRight: '1px solid #E2E8F0' }}>{entry.particular}</td>
                              <td style={{ padding: '8px', textAlign: 'center', borderRight: '1px solid #E2E8F0' }}>
                                {entry.vchType && (
                                  <span style={{ 
                                    padding: '2px 6px', 
                                    borderRadius: '4px', 
                                    fontSize: '10px', 
                                    fontWeight: '600',
                                    backgroundColor: entry.vchType === 'Sales' ? '#DCFCE7' : '#FEE2E2',
                                    color: entry.vchType === 'Sales' ? '#166534' : '#991B1B'
                                  }}>
                                    {entry.vchType}
                                  </span>
                                )}
                              </td>
                              <td style={{ padding: '8px', borderRight: '1px solid #E2E8F0' }}>
                                {entry.vchNo && entry.isInvoice && !entry.isHistorical ? (
                                  <button 
                                    onClick={() => viewInvoiceFromLedger(entry.vchNo)}
                                    style={{ 
                                      background: 'none', 
                                      border: 'none', 
                                      padding: 0, 
                                      fontWeight: '600', 
                                      color: '#2874A6', 
                                      cursor: 'pointer', 
                                      textDecoration: 'underline',
                                      fontSize: '11px'
                                    }}
                                    title="Click to view invoice"
                                  >
                                    {entry.vchNo}
                                  </button>
                                ) : (
                                  <span style={{ fontWeight: '600', color: entry.isCreditNote ? '#DC2626' : '#2874A6' }}>{entry.vchNo}</span>
                                )}
                              </td>
                              <td style={{ padding: '8px', textAlign: 'right', fontWeight: '600', borderRight: '1px solid #E2E8F0' }}>{entry.debit > 0 ? formatCurrencyShort(entry.debit) : ''}</td>
                              <td style={{ padding: '8px', textAlign: 'right', color: '#DC2626', borderRight: '1px solid #E2E8F0' }}>{entry.credit > 0 ? formatCurrencyShort(entry.credit) : ''}</td>
                              <td style={{ padding: '8px', textAlign: 'center', borderRight: '1px solid #E2E8F0' }}>{entry.receiptDate ? formatDate(entry.receiptDate) : ''}</td>
                              <td style={{ padding: '8px', textAlign: 'right', color: '#059669', fontWeight: entry.amountReceived > 0 ? '600' : '400', borderRight: '1px solid #E2E8F0' }}>{entry.amountReceived > 0 ? formatCurrencyShort(entry.amountReceived) : ''}</td>
                              <td style={{ padding: '8px', textAlign: 'right', borderRight: '1px solid #E2E8F0' }}>{entry.tdsReceived > 0 ? formatCurrencyShort(entry.tdsReceived) : ''}</td>
                              <td style={{ padding: '8px', textAlign: 'right', fontWeight: '600', color: typeof entry.balance === 'number' && entry.balance > 0 ? '#DC2626' : '', borderRight: '1px solid #E2E8F0' }}>
                                {entry.isOpening ? (entry.balance > 0 ? formatCurrencyShort(entry.balance) : '') : 
                                 (entry.balance === '-' ? '-' : (typeof entry.balance === 'number' && entry.balance > 0 ? formatCurrencyShort(entry.balance) : '-'))}
                              </td>
                              <td style={{ padding: '8px', textAlign: 'center' }}>
                                {entry.paymentStatus && (
                                  <span style={{ 
                                    padding: '2px 8px', 
                                    borderRadius: '4px', 
                                    fontSize: '10px', 
                                    fontWeight: '600',
                                    backgroundColor: entry.paymentStatus === 'Received' ? '#DCFCE7' : '#FEF3C7',
                                    color: entry.paymentStatus === 'Received' ? '#166534' : '#92400E'
                                  }}>
                                    {entry.paymentStatus}
                                  </span>
                                )}
                              </td>
                              {canEdit && (
                                <td style={{ padding: '8px', textAlign: 'center' }}>
                                  {entry.isHistorical && !entry.isOpening && (
                                    <button 
                                      onClick={() => handleDeleteHistoricalEntry(ledgerEntries.find(e => e.id === entry.id))}
                                      style={{ 
                                        padding: '2px 6px', 
                                        borderRadius: '4px', 
                                        fontSize: '10px', 
                                        fontWeight: '600',
                                        backgroundColor: '#FEE2E2', 
                                        color: '#991B1B',
                                        border: 'none',
                                        cursor: 'pointer'
                                      }}
                                      title="Delete historical entry"
                                    >
                                      🗑️
                                    </button>
                                  )}
                                </td>
                              )}
                            </tr>
                            
                            {/* Sub Rows for line items - same style as parent */}
                            {entry.subRows && entry.subRows.length > 0 && entry.subRows.map((sub, idx) => (
                              <tr key={`${entry.id}-sub-${idx}`} style={{ 
                                backgroundColor: entry.isOpening ? '#FEF3C7' : (entry.hasCN || entry.isCreditNote ? '#FFFBEB' : '#FFFFFF'),
                                borderBottom: idx === entry.subRows.length - 1 ? '2px solid #CBD5E1' : '1px solid #E2E8F0',
                                borderLeft: entry.hasCN || entry.isCreditNote ? '4px solid #F59E0B' : 'none'
                              }}>
                                <td style={{ padding: '6px 8px', borderRight: '1px solid #E2E8F0' }}></td>
                                <td style={{ padding: '6px 8px 6px 30px', color: '#475569', fontSize: '12px', borderRight: '1px solid #E2E8F0' }}>{sub.particular}</td>
                                <td style={{ padding: '6px 8px', borderRight: '1px solid #E2E8F0' }}></td>
                                <td style={{ padding: '6px 8px', borderRight: '1px solid #E2E8F0' }}></td>
                                <td style={{ padding: '6px 8px', textAlign: 'right', fontSize: '12px', borderRight: '1px solid #E2E8F0' }}>
                                  {sub.debit ? formatCurrencyShort(sub.debit) : ''}
                                </td>
                                <td style={{ padding: '6px 8px', textAlign: 'right', fontSize: '12px', borderRight: '1px solid #E2E8F0' }}>
                                  {sub.credit ? formatCurrencyShort(sub.credit) : ''}
                                </td>
                                <td style={{ padding: '6px 8px', borderRight: '1px solid #E2E8F0' }}></td>
                                <td style={{ padding: '6px 8px', borderRight: '1px solid #E2E8F0' }}></td>
                                <td style={{ padding: '6px 8px', borderRight: '1px solid #E2E8F0' }}></td>
                                <td style={{ padding: '6px 8px', borderRight: '1px solid #E2E8F0' }}></td>
                                <td style={{ padding: '6px 8px', borderRight: '1px solid #E2E8F0' }}></td>
                                {canEdit && <td style={{ padding: '6px 8px' }}></td>}
                              </tr>
                            ))}
                          </React.Fragment>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div style={{ padding: '60px', textAlign: 'center', color: '#94A3B8' }}>Select a party to view ledger</div>
            )}
          </Card>
        </div>
      </div>
    );
  };

  // ============================================
  // FOLLOWUPS TAB
  // ============================================
  
  // Compute followup data at component level (not inside render function)
  // State for followup search filter
  const [followupSearchText, setFollowupSearchText] = useState('');
  
  const pendingInvoicesForFollowup = useMemo(() => {
    const invoiceMap = new Map();
    
    // Helper to extract year+suffix for CN matching
    const getInvoiceYearSuffix = (vchNo) => {
      if (!vchNo) return '';
      const parts = vchNo.split('/');
      if (parts.length >= 3) {
        return parts.slice(1).join('/');
      } else if (parts.length === 2) {
        return parts.join('/');
      }
      return parts[parts.length - 1];
    };
    
    // Build CN map for historical matching
    const historicalCNs = safeLedgerEntries.filter(e => 
      e.isHistorical && (e.type === 'creditnote' || e.vchNo?.toUpperCase().startsWith('CN'))
    );
    const cnMapForFollowup = new Map();
    safeCreditNotes.forEach(cn => {
      const key = getInvoiceYearSuffix(cn.invoiceNo);
      if (key) cnMapForFollowup.set(key, cn);
    });
    historicalCNs.forEach(cn => {
      const key = getInvoiceYearSuffix(cn.vchNo);
      if (key && !cnMapForFollowup.has(key)) cnMapForFollowup.set(key, cn);
    });
    
    // Add system invoices
    safeMasterData.filter(r => r.invoiceGenerated && r.invoiceStatus === 'Approved').forEach(row => {
      if (!invoiceMap.has(row.invoiceNo)) {
        const receipt = safeReceipts.find(r => r.invoiceNo === row.invoiceNo);
        const cn = safeCreditNotes.find(c => c.invoiceNo === row.invoiceNo);
        const invoiceAmount = parseFloat(row.invoiceTotalAmount) || 0;
        // CN amounts may be negative, use Math.abs to get positive value for comparison
        const cnAmount = cn ? Math.abs(parseFloat(cn.totalAmount) || parseFloat(cn.credit) || 0) : 0;
        const isFullyCoveredByCN = cn && cnAmount >= invoiceAmount;
        
        // Include if: no receipt AND (no CN OR partial CN)
        if (!receipt && !isFullyCoveredByCN) {
          // Calculate pending amount (after partial CN if any)
          const pendingAmount = cn ? invoiceAmount - cnAmount : invoiceAmount;
          invoiceMap.set(row.invoiceNo, {
            invoiceNo: row.invoiceNo,
            partyName: row.partyName,
            invoiceDate: row.invoiceDate,
            invoiceTotalAmount: row.invoiceTotalAmount,
            pendingAmount: pendingAmount,
            hasPartialCN: !!cn && !isFullyCoveredByCN && cnAmount > 0,
            cnAmount: cnAmount,
            subject: row.subject,
            campaigns: [row],
            isHistorical: false,
            invoiceType: row.invoiceType || 'Individual'
          });
        }
      } else {
        if (invoiceMap.has(row.invoiceNo)) {
          invoiceMap.get(row.invoiceNo).campaigns.push(row);
        }
      }
    });
    
    // Add historical pending invoices
    safeLedgerEntries.filter(e => 
      e.isHistorical && 
      e.type !== 'creditnote' && 
      !e.vchNo?.toUpperCase().startsWith('CN') &&
      e.debit > 0
    ).forEach(entry => {
      if (!invoiceMap.has(entry.vchNo)) {
        const existingReceipt = safeReceipts.find(r => r.invoiceNo === entry.vchNo);
        
        // Check CN matching
        const invYearSuffix = getInvoiceYearSuffix(entry.vchNo);
        const matchingCN = cnMapForFollowup.get(invYearSuffix);
        const cnAmount = matchingCN ? Math.abs(parseFloat(matchingCN.totalAmount) || parseFloat(matchingCN.credit) || parseFloat(matchingCN.debit) || 0) : 0;
        const debit = parseFloat(entry.debit) || 0;
        const isFullyCoveredByCN = matchingCN && cnAmount >= debit;
        
        // Skip if receipt exists or fully covered by CN
        if (existingReceipt || isFullyCoveredByCN) return;
        
        const isPending = !(entry.amountReceived > 0);
        const hasPartialCN = matchingCN && cnAmount > 0 && cnAmount < debit;
        
        if (isPending || hasPartialCN) {
          const pendingAmount = hasPartialCN ? debit - cnAmount : debit;
          invoiceMap.set(entry.vchNo, {
            invoiceNo: entry.vchNo,
            partyName: entry.partyName,
            invoiceDate: entry.date,
            invoiceTotalAmount: debit,
            pendingAmount: pendingAmount,
            hasPartialCN: hasPartialCN,
            cnAmount: cnAmount,
            subject: entry.particulars || entry.narration,
            campaigns: [],
            isHistorical: true
          });
        }
      }
    });
    
    // Sort by party name (alphabetically)
    return Array.from(invoiceMap.values()).sort((a, b) => a.partyName.localeCompare(b.partyName));
  }, [safeMasterData, safeReceipts, safeCreditNotes, safeLedgerEntries]);
  
  const followupsByInvoice = useMemo(() => {
    const grouped = {};
    safeFollowups.forEach(f => {
      if (!grouped[f.invoiceNo]) grouped[f.invoiceNo] = [];
      grouped[f.invoiceNo].push(f);
    });
    Object.keys(grouped).forEach(key => {
      grouped[key].sort((a, b) => new Date(b.followupDate) - new Date(a.followupDate));
    });
    return grouped;
  }, [safeFollowups]);
  
  const upcomingFollowups = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return safeFollowups
      .filter(f => f.nextFollowupDate && f.nextFollowupDate >= today)
      .sort((a, b) => new Date(a.nextFollowupDate) - new Date(b.nextFollowupDate));
  }, [safeFollowups]);
  
  // Group pending invoices by party for display (with search filter)
  const pendingInvoicesGroupedByParty = useMemo(() => {
    // Apply search filter first
    let filteredInvoices = pendingInvoicesForFollowup;
    if (followupSearchText) {
      const search = followupSearchText.toLowerCase();
      filteredInvoices = pendingInvoicesForFollowup.filter(inv => 
        inv.invoiceNo?.toLowerCase().includes(search) ||
        inv.partyName?.toLowerCase().includes(search) ||
        inv.subject?.toLowerCase().includes(search)
      );
    }
    
    const grouped = {};
    filteredInvoices.forEach(inv => {
      if (!grouped[inv.partyName]) {
        grouped[inv.partyName] = {
          partyName: inv.partyName,
          invoices: [],
          totalAmount: 0
        };
      }
      grouped[inv.partyName].invoices.push(inv);
      // Use pending amount (after partial CN) instead of total amount
      grouped[inv.partyName].totalAmount += parseFloat(inv.pendingAmount || inv.invoiceTotalAmount) || 0;
    });
    // Sort parties alphabetically
    return Object.values(grouped).sort((a, b) => a.partyName.localeCompare(b.partyName));
  }, [pendingInvoicesForFollowup, followupSearchText]);
  
  const renderFollowups = () => {
    const filteredCount = pendingInvoicesGroupedByParty.reduce((sum, g) => sum + g.invoices.length, 0);
    
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '700', color: '#1E293B' }}>📞 Followups</h1>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <span style={{ padding: '6px 12px', backgroundColor: '#EFF6FF', borderRadius: '6px', fontSize: '12px', color: '#1E40AF', fontWeight: '600' }}>
              {pendingInvoicesGroupedByParty.length} Parties | {filteredCount} Invoices
            </span>
            {isDirector && <span style={{ padding: '8px 16px', backgroundColor: '#FEF3C7', borderRadius: '8px', fontSize: '13px', color: '#92400E', fontWeight: '600' }}>👁️ View Only</span>}
          </div>
        </div>
        
        {/* Search Filter */}
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', border: '1px solid #E2E8F0', padding: '14px 18px', marginBottom: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Filter size={18} color="#64748B" />
              <span style={{ fontSize: '13px', fontWeight: '700', color: '#475569' }}>Search:</span>
            </div>
            <div style={{ position: 'relative', flex: 1, maxWidth: '300px' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
              <input 
                type="text" 
                placeholder="Search party, invoice, subject..." 
                value={followupSearchText} 
                onChange={(e) => setFollowupSearchText(e.target.value)}
                style={{ padding: '8px 12px 8px 32px', fontSize: '13px', border: '1.5px solid #E2E8F0', borderRadius: '8px', width: '100%' }}
              />
            </div>
            {followupSearchText && (
              <button onClick={() => setFollowupSearchText('')} 
                style={{ padding: '8px 12px', fontSize: '13px', fontWeight: '600', border: '1.5px solid #FCA5A5', borderRadius: '8px', backgroundColor: '#FEE2E2', color: '#991B1B', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <X size={14} /> Clear
              </button>
            )}
            {followupSearchText && (
              <span style={{ fontSize: '13px', color: '#64748B' }}>
                Showing {filteredCount} of {pendingInvoicesForFollowup.length}
              </span>
            )}
          </div>
        </div>
        
        {/* Upcoming Followups */}
        {upcomingFollowups.length > 0 && (
          <Card title="🔔 Upcoming Followups" style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              {upcomingFollowups.slice(0, 5).map(f => (
                <div key={f.id} style={{ 
                  padding: '10px 14px', 
                  backgroundColor: new Date(f.nextFollowupDate).toISOString().split('T')[0] === new Date().toISOString().split('T')[0] ? '#FEE2E2' : '#FEF3C7', 
                  borderRadius: '8px',
                  border: '1px solid #FCD34D'
                }}>
                  <div style={{ fontWeight: '600', fontSize: '13px', color: '#92400E' }}>{f.invoiceNo}</div>
                  <div style={{ fontSize: '11px', color: '#78716C' }}>{f.partyName}</div>
                  <div style={{ fontSize: '12px', fontWeight: '600', color: '#DC2626', marginTop: '4px' }}>📅 {formatDate(f.nextFollowupDate)}</div>
                </div>
              ))}
            </div>
          </Card>
        )}
        
        {/* Pending Invoices Grouped by Party */}
        {pendingInvoicesGroupedByParty.length === 0 ? (
          <Card>
            <div style={{ padding: '40px', textAlign: 'center', color: '#94A3B8' }}>🎉 No pending invoices! All payments received.</div>
          </Card>
        ) : (
          pendingInvoicesGroupedByParty.map(partyGroup => (
            <Card key={partyGroup.partyName} style={{ marginBottom: '16px' }} noPadding>
              {/* Party Header */}
              <div style={{ 
                padding: '12px 16px', 
                backgroundColor: '#1E293B', 
                color: 'white',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '15px', fontWeight: '700' }}>🏢 {partyGroup.partyName}</span>
                  <span style={{ 
                    padding: '3px 10px', 
                    backgroundColor: '#3B82F6', 
                    borderRadius: '12px', 
                    fontSize: '11px', 
                    fontWeight: '600' 
                  }}>
                    {partyGroup.invoices.length} Invoice{partyGroup.invoices.length > 1 ? 's' : ''}
                  </span>
                </div>
                <div style={{ fontSize: '14px', fontWeight: '700', color: '#FCD34D' }}>
                  Total: {formatCurrency(partyGroup.totalAmount)}
                </div>
              </div>
              
              {/* Invoices Table */}
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '2px solid #E2E8F0' }}>
                    <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: '700' }}>Invoice No</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: '700' }}>Type</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: '700' }}>Invoice Date</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '700' }}>Amount</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: '700' }}>Days Pending</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: '700' }}>Last Followup</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: '700' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {partyGroup.invoices.map(inv => {
                    const invFollowups = followupsByInvoice[inv.invoiceNo] || [];
                    const lastFollowup = invFollowups[0];
                    const daysPending = Math.floor((new Date() - new Date(inv.invoiceDate)) / (1000 * 60 * 60 * 24));
                    const invoiceType = inv.isHistorical ? 'Historical' : (inv.invoiceType || (inv.campaigns?.length > 1 ? 'Combined' : 'Individual'));
                    
                    return (
                      <React.Fragment key={inv.invoiceNo}>
                        <tr style={{ borderBottom: '1px solid #E2E8F0', backgroundColor: daysPending > 30 ? '#FEF2F2' : daysPending > 15 ? '#FFFBEB' : '#FFFFFF' }}>
                          <td style={{ padding: '10px 12px', fontWeight: '600', color: '#2874A6' }}>
                            {inv.invoiceNo}
                            {inv.hasPartialCN && (
                              <span style={{ 
                                marginLeft: '6px', 
                                padding: '2px 6px', 
                                backgroundColor: '#FEF3C7', 
                                color: '#92400E', 
                                borderRadius: '4px', 
                                fontSize: '9px', 
                                fontWeight: '700' 
                              }}>
                                Partial CN
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                            <span style={{ 
                              padding: '3px 8px', 
                              borderRadius: '6px', 
                              fontSize: '10px', 
                              fontWeight: '600',
                              backgroundColor: invoiceType === 'Historical' ? '#E0E7FF' : invoiceType === 'Combined' ? '#F3E8FF' : '#DCFCE7',
                              color: invoiceType === 'Historical' ? '#3730A3' : invoiceType === 'Combined' ? '#7C3AED' : '#166534'
                            }}>
                              {invoiceType}
                            </span>
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'center' }}>{formatDate(inv.invoiceDate)}</td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '600' }}>
                            {inv.hasPartialCN ? (
                              <div>
                                <div style={{ color: '#DC2626' }}>{formatCurrency(inv.pendingAmount)}</div>
                                <div style={{ fontSize: '9px', color: '#64748B', textDecoration: 'line-through' }}>{formatCurrency(inv.invoiceTotalAmount)}</div>
                              </div>
                            ) : (
                              formatCurrency(inv.invoiceTotalAmount)
                            )}
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                            <span style={{ 
                              padding: '3px 10px', 
                              borderRadius: '12px', 
                              fontSize: '11px', 
                              fontWeight: '700',
                              backgroundColor: daysPending > 30 ? '#FEE2E2' : daysPending > 15 ? '#FEF3C7' : '#DCFCE7',
                              color: daysPending > 30 ? '#991B1B' : daysPending > 15 ? '#92400E' : '#166534'
                            }}>
                              {daysPending} days
                            </span>
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'center', fontSize: '11px' }}>
                            {lastFollowup ? (
                              <div>
                                <div style={{ fontWeight: '600' }}>{formatDate(lastFollowup.followupDate)}</div>
                                <div style={{ color: '#64748B', fontSize: '10px' }}>{lastFollowup.notes?.substring(0, 30)}{lastFollowup.notes?.length > 30 ? '...' : ''}</div>
                              </div>
                            ) : (
                              <span style={{ color: '#DC2626', fontWeight: '600' }}>No followup yet</span>
                            )}
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                            <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                              {canEdit && <ActionButton icon={Plus} small variant="primary" onClick={() => openFollowupModal(inv)} title="Add Followup" />}
                              <ActionButton icon={Clipboard} small variant="brand" onClick={() => copyFollowupTemplate(inv)} title="Copy Email Template" />
                              <ActionButton icon={Mail} small variant="success" onClick={() => openGmailWithFollowup(inv)} title="Search in Gmail" />
                            </div>
                          </td>
                        </tr>
                        {/* Followup history for this invoice */}
                        {invFollowups.length > 0 && (
                          <tr>
                            <td colSpan="7" style={{ padding: '8px 12px 12px 40px', backgroundColor: '#F8FAFC' }}>
                              <div style={{ fontSize: '11px', fontWeight: '600', color: '#64748B', marginBottom: '6px' }}>Followup History:</div>
                              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                {invFollowups.map(f => (
                                  <div key={f.id} style={{ 
                                    padding: '6px 10px', 
                                    backgroundColor: '#FFFFFF', 
                                    borderRadius: '6px', 
                                    border: '1px solid #E2E8F0',
                                    fontSize: '11px'
                                  }}>
                                    <div style={{ fontWeight: '600', color: '#2874A6' }}>{formatDate(f.followupDate)}</div>
                                    <div style={{ color: '#475569', marginTop: '2px' }}>{f.notes}</div>
                                    {f.nextFollowupDate && (
                                      <div style={{ color: '#DC2626', marginTop: '2px', fontSize: '10px' }}>Next: {formatDate(f.nextFollowupDate)}</div>
                                    )}
                                    {canEdit && (
                                      <button onClick={() => handleDeleteFollowup(f.id)} style={{ 
                                        background: 'none', border: 'none', color: '#DC2626', cursor: 'pointer', 
                                        fontSize: '10px', padding: '2px 0', marginTop: '4px' 
                                      }}>
                                        🗑️ Delete
                                      </button>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </Card>
          ))
        )}
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
        
        {/* WhatsApp Notification Settings */}
        <Card title="📱 WhatsApp Notifications">
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={whatsappSettings.enabled}
                onChange={(e) => setWhatsappSettings(prev => ({ ...prev, enabled: e.target.checked }))}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
              <span style={{ fontSize: '14px', fontWeight: '600', color: '#1E293B' }}>Enable WhatsApp Notifications</span>
            </label>
          </div>
          
          {whatsappSettings.enabled && (
            <>
              <div style={{ padding: '12px', backgroundColor: '#DCFCE7', borderRadius: '8px', marginBottom: '16px', fontSize: '12px', color: '#166534', border: '1px solid #86EFAC' }}>
                <strong>✅ FREE Setup using CallMeBot:</strong><br />
                1. Save this number in contacts: <strong>+34 644 71 81 99</strong><br />
                2. Send this message to the number on WhatsApp: <strong>"I allow callmebot to send me messages"</strong><br />
                3. You'll receive an API key - enter it below<br />
                4. Repeat for each phone number you want to receive notifications
              </div>
              
              <div style={{ padding: '14px', backgroundColor: '#F8FAFC', borderRadius: '8px', marginBottom: '12px', border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: '13px', fontWeight: '700', color: '#1E293B', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Phone size={16} /> Finance Team
                </div>
                <InputField 
                  label="Phone (with country code)" 
                  value={whatsappSettings.financePhone} 
                  onChange={(e) => setWhatsappSettings(prev => ({ ...prev, financePhone: e.target.value }))} 
                  placeholder="919876543210"
                  small 
                />
                <InputField 
                  label="API Key (from CallMeBot)" 
                  value={whatsappSettings.financeApiKey} 
                  onChange={(e) => setWhatsappSettings(prev => ({ ...prev, financeApiKey: e.target.value }))} 
                  placeholder="123456"
                  small 
                />
                {whatsappSettings.financePhone && whatsappSettings.financeApiKey && (
                  <ActionButton 
                    icon={Send} 
                    label="Test Finance" 
                    variant="success" 
                    small 
                    onClick={() => testWhatsAppNotification(whatsappSettings.financePhone, whatsappSettings.financeApiKey)} 
                  />
                )}
              </div>
              
              <div style={{ padding: '14px', backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: '13px', fontWeight: '700', color: '#1E293B', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Phone size={16} /> Director
                </div>
                <InputField 
                  label="Phone (with country code)" 
                  value={whatsappSettings.directorPhone} 
                  onChange={(e) => setWhatsappSettings(prev => ({ ...prev, directorPhone: e.target.value }))} 
                  placeholder="919876543210"
                  small 
                />
                <InputField 
                  label="API Key (from CallMeBot)" 
                  value={whatsappSettings.directorApiKey} 
                  onChange={(e) => setWhatsappSettings(prev => ({ ...prev, directorApiKey: e.target.value }))} 
                  placeholder="123456"
                  small 
                />
                {whatsappSettings.directorPhone && whatsappSettings.directorApiKey && (
                  <ActionButton 
                    icon={Send} 
                    label="Test Director" 
                    variant="success" 
                    small 
                    onClick={() => testWhatsAppNotification(whatsappSettings.directorPhone, whatsappSettings.directorApiKey)} 
                  />
                )}
              </div>
            </>
          )}
          
          {!whatsappSettings.enabled && (
            <div style={{ padding: '20px', backgroundColor: '#F8FAFC', borderRadius: '8px', textAlign: 'center', color: '#64748B', fontSize: '13px' }}>
              WhatsApp notifications are disabled. Enable to receive FREE alerts for invoices, approvals, and payments.
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
        
        {/* Party Master Upload */}
        <Card title="👥 Party Master">
          <input type="file" ref={partyMasterInputRef} accept=".xlsx,.xls,.csv" style={{ display: 'none' }} onChange={handlePartyMasterUpload} />
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
            <ActionButton icon={Upload} label="Upload Parties" variant="brand" small onClick={() => partyMasterInputRef.current?.click()} />
            <ActionButton icon={Download} label="Template" small onClick={downloadPartyMasterTemplate} />
          </div>
          <div style={{ padding: '10px', backgroundColor: '#EFF6FF', borderRadius: '8px', fontSize: '12px', color: '#1E40AF', marginBottom: '12px' }}>
            <strong>Upload Format:</strong> Name of Ledger, Ledger Group, State Name, GST Registration Type, GSTIN/UIN
          </div>
          {Object.keys(partyMaster).length > 0 && (
            <div style={{ maxHeight: '150px', overflowY: 'auto', border: '1px solid #E2E8F0', borderRadius: '8px' }}>
              {Object.entries(partyMaster).slice(0, 20).map(([party, data]) => (
                <div key={party} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', borderBottom: '1px solid #F1F5F9', fontSize: '11px' }}>
                  <span style={{ fontWeight: '600' }}>{party.length > 30 ? party.substring(0, 30) + '...' : party}</span>
                  <span style={{ color: '#64748B' }}>{data.stateName || '-'} | {data.gstin ? data.gstin.substring(0, 10) + '...' : '-'}</span>
                </div>
              ))}
              {Object.keys(partyMaster).length > 20 && (
                <div style={{ padding: '8px 12px', textAlign: 'center', color: '#64748B', fontSize: '11px' }}>
                  ... and {Object.keys(partyMaster).length - 20} more parties
                </div>
              )}
            </div>
          )}
          {Object.keys(partyMaster).length === 0 && (
            <div style={{ padding: '20px', textAlign: 'center', color: '#94A3B8', fontSize: '13px' }}>
              No party master uploaded yet
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
            
            {/* Show Edit Comments (Need Edits remarks) */}
            {selectedRow.editComments && (
              <div style={{ backgroundColor: '#FEE2E2', padding: '12px', borderRadius: '8px', marginBottom: '16px', border: '1px solid #FCA5A5' }}>
                <div style={{ fontWeight: '600', color: '#991B1B', fontSize: '13px', marginBottom: '4px' }}>📝 Need Edits - Director Remarks:</div>
                <div style={{ fontSize: '13px', color: '#7F1D1D' }}>{selectedRow.editComments}</div>
              </div>
            )}
            
            {/* Show Approval Remarks */}
            {selectedRow.approvalRemarks && selectedRow.invoiceStatus === 'Approved' && (
              <div style={{ backgroundColor: '#DCFCE7', padding: '12px', borderRadius: '8px', marginBottom: '16px', border: '1px solid #86EFAC' }}>
                <div style={{ fontWeight: '600', color: '#166534', fontSize: '13px', marginBottom: '4px' }}>✅ Approved - Director Remarks:</div>
                <div style={{ fontSize: '13px', color: '#15803D' }}>{selectedRow.approvalRemarks}</div>
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
              <div style={{ backgroundColor: selectedRow.invoiceStatus === 'Approved' ? '#DCFCE7' : (selectedRow.invoiceStatus === 'Need Edits' ? '#FEF3C7' : '#F8FAFC'), padding: '16px', borderRadius: '10px', marginBottom: '16px', border: '1px solid ' + (selectedRow.invoiceStatus === 'Approved' ? '#86EFAC' : (selectedRow.invoiceStatus === 'Need Edits' ? '#FCD34D' : '#E2E8F0')) }}>
                <div style={{ fontWeight: '600', color: selectedRow.invoiceStatus === 'Approved' ? '#166534' : (selectedRow.invoiceStatus === 'Need Edits' ? '#92400E' : '#64748B'), fontSize: '14px' }}>
                  {selectedRow.invoiceStatus === 'Approved' ? '✅ Approved by Director' : (selectedRow.invoiceStatus === 'Need Edits' ? '✏️ Edits Required by Director' : '⏳ Pending Director Approval')}
                </div>
                <div style={{ fontSize: '13px', color: selectedRow.invoiceStatus === 'Approved' ? '#15803D' : (selectedRow.invoiceStatus === 'Need Edits' ? '#A16207' : '#64748B'), marginTop: '6px' }}>
                  {selectedRow.invoiceStatus === 'Approved' ? 'This invoice has been approved and is ready for mailing.' : (selectedRow.invoiceStatus === 'Need Edits' ? 'Please make the required changes and resubmit for approval.' : 'This invoice is awaiting Director approval.')}
                </div>
              </div>
            )}
            
            {isDirector && (
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>💬 Remarks (optional for Approve, visible to Finance)</label>
                <textarea
                  value={editComments}
                  onChange={(e) => setEditComments(e.target.value)}
                  placeholder="Enter remarks or comments..."
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

      {/* Change Password Modal */}
      <Modal isOpen={showPasswordModal} onClose={() => { setShowPasswordModal(false); setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' }); setPasswordError(''); }} title="🔐 Change Password" width="400px">
        <div>
          <div style={{ backgroundColor: '#EFF6FF', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>
            <div style={{ fontSize: '13px' }}><strong>User:</strong> {userRole === 'director' ? 'Director' : 'Finance Team'}</div>
          </div>
          
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>Current Password</label>
            <input
              type="password"
              value={passwordForm.currentPassword}
              onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
              placeholder="Enter current password"
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid #D1D5DB', fontSize: '14px', boxSizing: 'border-box' }}
            />
          </div>
          
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>New Password</label>
            <input
              type="password"
              value={passwordForm.newPassword}
              onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
              placeholder="Enter new password (min 6 characters)"
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid #D1D5DB', fontSize: '14px', boxSizing: 'border-box' }}
            />
          </div>
          
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>Confirm New Password</label>
            <input
              type="password"
              value={passwordForm.confirmPassword}
              onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
              placeholder="Confirm new password"
              onKeyPress={(e) => e.key === 'Enter' && handlePasswordChange()}
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid #D1D5DB', fontSize: '14px', boxSizing: 'border-box' }}
            />
          </div>
          
          {passwordError && (
            <div style={{ marginBottom: '16px', padding: '10px', backgroundColor: '#FEE2E2', borderRadius: '8px', color: '#991B1B', fontSize: '13px' }}>
              {passwordError}
            </div>
          )}
          
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <ActionButton label="Cancel" onClick={() => { setShowPasswordModal(false); setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' }); setPasswordError(''); }} />
            <ActionButton label="Change Password" variant="brand" icon={Lock} onClick={handlePasswordChange} />
          </div>
        </div>
      </Modal>

      {/* Change Password Modal */}
      <Modal isOpen={showPasswordModal} onClose={() => { setShowPasswordModal(false); setPasswordError(''); setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' }); }} title="🔐 Change Password" width="400px">
        <div>
          <div style={{ backgroundColor: '#EFF6FF', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>
            <div style={{ fontSize: '13px', color: '#1E40AF' }}>Changing password for: <strong>{userRole === 'director' ? 'Director' : 'Finance Team'}</strong></div>
          </div>
          
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>Current Password</label>
            <input
              type="password"
              value={passwordForm.currentPassword}
              onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
              placeholder="Enter current password"
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid #D1D5DB', fontSize: '14px', boxSizing: 'border-box' }}
            />
          </div>
          
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>New Password</label>
            <input
              type="password"
              value={passwordForm.newPassword}
              onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
              placeholder="Enter new password (min 6 chars)"
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid #D1D5DB', fontSize: '14px', boxSizing: 'border-box' }}
            />
          </div>
          
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>Confirm New Password</label>
            <input
              type="password"
              value={passwordForm.confirmPassword}
              onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
              placeholder="Re-enter new password"
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid #D1D5DB', fontSize: '14px', boxSizing: 'border-box' }}
            />
          </div>
          
          {passwordError && (
            <div style={{ marginBottom: '16px', padding: '10px', backgroundColor: '#FEE2E2', borderRadius: '8px', color: '#991B1B', fontSize: '13px' }}>
              {passwordError}
            </div>
          )}
          
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <ActionButton label="Cancel" onClick={() => { setShowPasswordModal(false); setPasswordError(''); setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' }); }} />
            <ActionButton label="Change Password" variant="brand" icon={Lock} onClick={handlePasswordChange} />
          </div>
        </div>
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

      {/* Historical Ledger Upload Modal */}
      <Modal isOpen={showHistoricalLedgerModal} onClose={() => setShowHistoricalLedgerModal(false)} title="📂 Import Historical Ledger" width="600px">
        <input type="file" ref={historicalLedgerInputRef} accept=".xlsx,.xls,.csv" style={{ display: 'none' }} onChange={handleHistoricalLedgerUpload} />
        
        <div style={{ padding: '16px', backgroundColor: '#EFF6FF', borderRadius: '10px', marginBottom: '16px', border: '1px solid #BFDBFE' }}>
          <div style={{ fontWeight: '700', color: '#1E40AF', marginBottom: '8px', fontSize: '14px' }}>📋 How to Import Historical Ledger</div>
          <div style={{ fontSize: '12px', color: '#1E3A8A', lineHeight: '1.6' }}>
            <p style={{ margin: '0 0 8px 0' }}>Upload your existing ledger data in the format shown in the template. This will import all historical transactions.</p>
            <p style={{ margin: 0 }}><strong>Supported columns:</strong> Date, Particular, Vch Type, Vch No., Debit, Credit, Date of Receipt, Amount Received, TDS Received, Balance, Payment Status</p>
          </div>
        </div>
        
        {selectedParty && (
          <div style={{ padding: '12px', backgroundColor: '#DCFCE7', borderRadius: '8px', marginBottom: '16px', border: '1px solid #86EFAC' }}>
            <div style={{ fontSize: '13px', color: '#166534' }}>
              <strong>✅ Selected Party:</strong> {selectedParty}
            </div>
            <div style={{ fontSize: '11px', color: '#15803D', marginTop: '4px' }}>
              All entries from the uploaded file will be imported for this party
            </div>
          </div>
        )}
        
        {!selectedParty && (
          <div style={{ padding: '12px', backgroundColor: '#FEE2E2', borderRadius: '8px', marginBottom: '16px', border: '1px solid #FCA5A5' }}>
            <div style={{ fontSize: '13px', color: '#991B1B' }}>
              <strong>⚠️ No Party Selected</strong>
            </div>
            <div style={{ fontSize: '12px', color: '#B91C1C', marginTop: '4px' }}>
              Please close this modal and select a party from the Parties list on the left, then click "Import Historical" again.
            </div>
          </div>
        )}
        
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginBottom: '16px' }}>
          <ActionButton icon={Download} label="Download Template" variant="brand" onClick={downloadHistoricalLedgerTemplate} />
          {selectedParty ? (
            <ActionButton icon={Upload} label="Upload Ledger" variant="success" onClick={() => historicalLedgerInputRef.current?.click()} />
          ) : (
            <button 
              disabled 
              style={{ 
                padding: '8px 16px', 
                fontSize: '13px', 
                fontWeight: '600', 
                border: 'none', 
                borderRadius: '8px', 
                backgroundColor: '#E2E8F0', 
                color: '#94A3B8', 
                cursor: 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Upload size={16} /> Upload Ledger
            </button>
          )}
        </div>
        
        <div style={{ padding: '14px', backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
          <div style={{ fontWeight: '600', color: '#475569', marginBottom: '8px', fontSize: '13px' }}>📊 Expected Format (matches your ledger export):</div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
              <thead>
                <tr style={{ backgroundColor: '#E2E8F0' }}>
                  <th style={{ padding: '6px', border: '1px solid #CBD5E1', textAlign: 'left' }}>Date</th>
                  <th style={{ padding: '6px', border: '1px solid #CBD5E1', textAlign: 'left' }}>Particular</th>
                  <th style={{ padding: '6px', border: '1px solid #CBD5E1', textAlign: 'left' }}>Vch Type</th>
                  <th style={{ padding: '6px', border: '1px solid #CBD5E1', textAlign: 'left' }}>Vch No.</th>
                  <th style={{ padding: '6px', border: '1px solid #CBD5E1', textAlign: 'right' }}>Debit</th>
                  <th style={{ padding: '6px', border: '1px solid #CBD5E1', textAlign: 'right' }}>Credit</th>
                  <th style={{ padding: '6px', border: '1px solid #CBD5E1', textAlign: 'right' }}>Amt Recd</th>
                  <th style={{ padding: '6px', border: '1px solid #CBD5E1', textAlign: 'left' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ padding: '4px 6px', border: '1px solid #E2E8F0' }}>02-Jun-21</td>
                  <td style={{ padding: '4px 6px', border: '1px solid #E2E8F0' }}>DB Corp Ltd</td>
                  <td style={{ padding: '4px 6px', border: '1px solid #E2E8F0' }}>Sales</td>
                  <td style={{ padding: '4px 6px', border: '1px solid #E2E8F0' }}>MB/2020-21/0411</td>
                  <td style={{ padding: '4px 6px', border: '1px solid #E2E8F0', textAlign: 'right' }}>6,000</td>
                  <td style={{ padding: '4px 6px', border: '1px solid #E2E8F0' }}></td>
                  <td style={{ padding: '4px 6px', border: '1px solid #E2E8F0', textAlign: 'right' }}>44,371</td>
                  <td style={{ padding: '4px 6px', border: '1px solid #E2E8F0' }}>Received</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
          <ActionButton label="Close" onClick={() => setShowHistoricalLedgerModal(false)} />
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
      <Modal isOpen={showCreditNoteModal} onClose={() => { setShowCreditNoteModal(false); setCreditNoteForm({ amount: '', gst: '', reason: '', date: new Date().toISOString().split('T')[0] }); }} title="📝 Create Credit Note" width="500px">
        {selectedRow && (() => {
          const isSameState = selectedRow.statePartyDetails?.toUpperCase().includes('MAHARASHTRA');
          const gstLabel = isSameState ? 'CGST + SGST (9% + 9%)' : 'IGST (18%)';
          const baseAmount = parseFloat(creditNoteForm.amount) || 0;
          const gstAmount = parseFloat(creditNoteForm.gst) || 0;
          const totalCredit = baseAmount + gstAmount;
          
          return (
          <div>
            <div style={{ backgroundColor: '#EFF6FF', padding: '14px', borderRadius: '10px', marginBottom: '16px' }}>
              <div style={{ fontSize: '14px', marginBottom: '4px' }}><strong>Invoice:</strong> {selectedRow.invoiceNo}</div>
              <div style={{ fontSize: '14px', marginBottom: '4px' }}><strong>Party:</strong> {selectedRow.partyName}</div>
              <div style={{ fontSize: '14px', marginBottom: '4px' }}><strong>Invoice Amount:</strong> {formatCurrency(selectedRow.invoiceTotalAmount)}</div>
              <div style={{ fontSize: '12px', color: '#2563EB' }}><strong>GST Type:</strong> {isSameState ? 'CGST + SGST (Intra-state)' : 'IGST (Inter-state)'}</div>
            </div>
            
            <div style={{ marginBottom: '12px' }}>
              <InputField label="Credit Note Date" type="date" value={creditNoteForm.date} onChange={(e) => setCreditNoteForm({ ...creditNoteForm, date: e.target.value })} small />
            </div>
            
            <div style={{ backgroundColor: '#FEF2F2', padding: '14px', borderRadius: '10px', marginBottom: '12px', border: '1px solid #FECACA' }}>
              <div style={{ fontWeight: '700', color: '#991B1B', marginBottom: '10px', fontSize: '13px' }}>💰 Credit Note Breakdown</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <InputField label="Base Amount" type="number" value={creditNoteForm.amount} onChange={(e) => setCreditNoteForm({ ...creditNoteForm, amount: e.target.value })} placeholder="0.00" small />
                <InputField label={gstLabel} type="number" value={creditNoteForm.gst} onChange={(e) => setCreditNoteForm({ ...creditNoteForm, gst: e.target.value })} placeholder="0.00" small />
              </div>
              <div style={{ marginTop: '10px', padding: '8px', backgroundColor: '#FEE2E2', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', fontWeight: '600', color: '#991B1B' }}>Total Credit:</span>
                <span style={{ fontSize: '15px', fontWeight: '700', color: '#991B1B' }}>
                  {formatCurrency(totalCredit)}
                </span>
              </div>
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
              <ActionButton label="Create Credit Note" variant="danger" icon={FileText} onClick={handleCreditNoteSubmit} />
            </div>
          </div>
          );
        })()}
      </Modal>

      {/* Followup Modal */}
      <Modal isOpen={showFollowupModal} onClose={() => { setShowFollowupModal(false); setSelectedInvoiceForFollowup(null); }} title="📞 Add Followup" width="500px">
        {selectedInvoiceForFollowup && (
          <div>
            <div style={{ backgroundColor: '#EFF6FF', padding: '14px', borderRadius: '10px', marginBottom: '16px' }}>
              <div style={{ fontSize: '14px', marginBottom: '4px' }}><strong>Invoice:</strong> {selectedInvoiceForFollowup.invoiceNo}</div>
              <div style={{ fontSize: '14px', marginBottom: '4px' }}><strong>Party:</strong> {selectedInvoiceForFollowup.partyName}</div>
              <div style={{ fontSize: '14px', marginBottom: '4px' }}><strong>Amount:</strong> {formatCurrency(selectedInvoiceForFollowup.invoiceTotalAmount || selectedInvoiceForFollowup.totalAmount)}</div>
              <div style={{ fontSize: '14px' }}><strong>Invoice Date:</strong> {formatDate(selectedInvoiceForFollowup.invoiceDate || selectedInvoiceForFollowup.date)}</div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <InputField label="Followup Date" type="date" value={followupForm.date} onChange={(e) => setFollowupForm({ ...followupForm, date: e.target.value })} small />
              <InputField label="Next Followup Date" type="date" value={followupForm.nextFollowupDate} onChange={(e) => setFollowupForm({ ...followupForm, nextFollowupDate: e.target.value })} small />
            </div>
            
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>Followup Notes *</label>
              <textarea
                value={followupForm.notes}
                onChange={(e) => setFollowupForm({ ...followupForm, notes: e.target.value })}
                placeholder="Enter followup notes (e.g., Spoke with accounts team, payment promised by next week)"
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1.5px solid #D1D5DB', fontSize: '13px', minHeight: '80px', resize: 'vertical', boxSizing: 'border-box' }}
              />
            </div>
            
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>Status</label>
              <select
                value={followupForm.status}
                onChange={(e) => setFollowupForm({ ...followupForm, status: e.target.value })}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid #D1D5DB', fontSize: '13px' }}
              >
                <option value="Pending">Pending</option>
                <option value="Promised">Promised - Payment Expected</option>
                <option value="Disputed">Disputed</option>
                <option value="No Response">No Response</option>
              </select>
            </div>
            
            <div style={{ backgroundColor: '#F0FDF4', padding: '12px', borderRadius: '8px', marginBottom: '16px', border: '1px solid #86EFAC' }}>
              <div style={{ fontSize: '12px', fontWeight: '600', color: '#166534', marginBottom: '8px' }}>📧 Quick Actions</div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <ActionButton icon={Clipboard} label="Copy Email Template" small variant="brand" onClick={() => copyFollowupTemplate(selectedInvoiceForFollowup)} />
                <ActionButton icon={Mail} label="Search in Gmail" small variant="success" onClick={() => openGmailWithFollowup(selectedInvoiceForFollowup)} />
              </div>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <ActionButton label="Cancel" onClick={() => setShowFollowupModal(false)} />
              <ActionButton label="Save Followup" variant="primary" icon={Plus} onClick={handleAddFollowup} />
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

      {/* Notifications Modal */}
      <Modal isOpen={showNotificationsModal} onClose={() => setShowNotificationsModal(false)} title="🔔 Notifications" width="550px">
        <div>
          {/* Header Actions */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ fontSize: '14px', color: '#64748B' }}>
              {unreadCount > 0 ? `${unreadCount} unread` : 'No unread notifications'}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              {unreadCount > 0 && (
                <button onClick={markAllNotificationsAsRead} style={{ padding: '6px 12px', fontSize: '12px', fontWeight: '600', border: '1px solid #E2E8F0', borderRadius: '6px', backgroundColor: '#F8FAFC', color: '#475569', cursor: 'pointer' }}>
                  Mark all as read
                </button>
              )}
              {notifications.length > 0 && canEdit && (
                <button onClick={clearAllNotifications} style={{ padding: '6px 12px', fontSize: '12px', fontWeight: '600', border: '1px solid #FCA5A5', borderRadius: '6px', backgroundColor: '#FEE2E2', color: '#991B1B', cursor: 'pointer' }}>
                  Clear all
                </button>
              )}
            </div>
          </div>
          
          {/* Notifications List */}
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {userNotifications.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#94A3B8' }}>
                <Bell size={40} style={{ marginBottom: '12px', opacity: 0.5 }} />
                <div style={{ fontSize: '16px', fontWeight: '600' }}>No notifications</div>
                <div style={{ fontSize: '13px', marginTop: '4px' }}>You're all caught up!</div>
              </div>
            ) : (
              userNotifications.map(notification => {
                const isUnread = !(notification.read && notification.read[userRole]);
                const getTypeIcon = (type) => {
                  switch (type) {
                    case 'upload': return '📊';
                    case 'invoice': return '🧾';
                    case 'approval': return '✅';
                    case 'edit': return '✏️';
                    case 'receipt': return '💰';
                    default: return '📌';
                  }
                };
                const getTypeBg = (type) => {
                  switch (type) {
                    case 'upload': return '#EFF6FF';
                    case 'invoice': return '#FEF3C7';
                    case 'approval': return '#DCFCE7';
                    case 'edit': return '#FEE2E2';
                    case 'receipt': return '#F0FDF4';
                    default: return '#F8FAFC';
                  }
                };
                
                return (
                  <div 
                    key={notification.id} 
                    onClick={() => markNotificationAsRead(notification.id)}
                    style={{ 
                      padding: '14px', 
                      borderRadius: '10px', 
                      marginBottom: '8px', 
                      backgroundColor: isUnread ? getTypeBg(notification.type) : '#F8FAFC',
                      border: isUnread ? '2px solid #2874A6' : '1px solid #E2E8F0',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                      <div style={{ fontSize: '20px' }}>{getTypeIcon(notification.type)}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '14px', fontWeight: isUnread ? '600' : '500', color: '#1E293B', lineHeight: '1.4' }}>
                          {notification.message}
                        </div>
                        <div style={{ display: 'flex', gap: '12px', marginTop: '8px', fontSize: '11px', color: '#64748B' }}>
                          <span>By: {notification.createdBy === 'finance' ? 'Finance Team' : 'Director'}</span>
                          <span>•</span>
                          <span>{new Date(notification.createdAt).toLocaleString()}</span>
                        </div>
                      </div>
                      {isUnread && (
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#DC2626', flexShrink: 0 }} />
                      )}
                    </div>
                  </div>
                );
              })
            )}
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
      case 'followups': return renderFollowups();
      case 'reports': return renderReports();
      case 'settings': return userRole === 'finance' ? renderSettings() : renderReports();
      default: return renderMasterSheet();
    }
  };

  // Login Screen
  const renderLoginScreen = () => (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      background: 'linear-gradient(135deg, #1E3A5F 0%, #2874A6 50%, #1E3A5F 100%)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      padding: '20px'
    }}>
      <div style={{ 
        backgroundColor: '#FFFFFF', 
        padding: '0', 
        borderRadius: '24px', 
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', 
        width: '420px', 
        maxWidth: '95vw',
        overflow: 'hidden'
      }}>
        {/* Header with gradient */}
        <div style={{ 
          background: 'linear-gradient(135deg, #1E3A5F 0%, #2874A6 100%)',
          padding: '32px 40px',
          textAlign: 'center'
        }}>
          {/* Logo + FinMate together */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '8px' }}>
            <img src="/logo.png" alt="JAC" style={{ width: '60px', height: 'auto', borderRadius: '8px', backgroundColor: 'white', padding: '4px' }} />
            <span style={{ fontSize: '36px', fontWeight: '800', color: '#FFFFFF', letterSpacing: '-1px' }}>FinMate</span>
          </div>
          <p style={{ margin: 0, color: 'rgba(255,255,255,0.8)', fontSize: '14px', fontWeight: '500' }}>Finance Management System</p>
        </div>
        
        {/* Form section */}
        <div style={{ padding: '32px 40px' }}>
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#1E3A5F', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Username</label>
            <div style={{ position: 'relative' }}>
              <Users size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
              <input
                type="text"
                value={loginForm.username}
                onChange={(e) => setLoginForm(prev => ({ ...prev, username: e.target.value }))}
                placeholder="Enter username"
                style={{ 
                  width: '100%', 
                  padding: '14px 14px 14px 44px', 
                  borderRadius: '12px', 
                  border: '2px solid #E2E8F0', 
                  fontSize: '15px', 
                  boxSizing: 'border-box',
                  transition: 'border-color 0.2s, box-shadow 0.2s',
                  outline: 'none'
                }}
                onFocus={(e) => { e.target.style.borderColor = '#2874A6'; e.target.style.boxShadow = '0 0 0 3px rgba(40,116,166,0.1)'; }}
                onBlur={(e) => { e.target.style.borderColor = '#E2E8F0'; e.target.style.boxShadow = 'none'; }}
              />
            </div>
          </div>
          
          <div style={{ marginBottom: '28px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#1E3A5F', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
              <input
                type="password"
                value={loginForm.password}
                onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                placeholder="Enter password"
                onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                style={{ 
                  width: '100%', 
                  padding: '14px 14px 14px 44px', 
                  borderRadius: '12px', 
                  border: '2px solid #E2E8F0', 
                  fontSize: '15px', 
                  boxSizing: 'border-box',
                  transition: 'border-color 0.2s, box-shadow 0.2s',
                  outline: 'none'
                }}
                onFocus={(e) => { e.target.style.borderColor = '#2874A6'; e.target.style.boxShadow = '0 0 0 3px rgba(40,116,166,0.1)'; }}
                onBlur={(e) => { e.target.style.borderColor = '#E2E8F0'; e.target.style.boxShadow = 'none'; }}
              />
            </div>
          </div>
          
          {loginError && (
            <div style={{ 
              marginBottom: '20px', 
              padding: '14px', 
              backgroundColor: '#FEF2F2', 
              borderRadius: '12px', 
              color: '#DC2626', 
              fontSize: '14px', 
              textAlign: 'center',
              border: '1px solid #FECACA',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}>
              <AlertCircle size={18} />
              {loginError}
            </div>
          )}
          
          <button
            onClick={handleLogin}
            style={{ 
              width: '100%', 
              padding: '16px', 
              fontSize: '16px', 
              fontWeight: '700', 
              border: 'none', 
              borderRadius: '12px', 
              cursor: passwordsLoaded ? 'pointer' : 'wait', 
              background: passwordsLoaded ? 'linear-gradient(135deg, #1E3A5F 0%, #2874A6 100%)' : '#94A3B8',
              color: 'white',
              transition: 'transform 0.2s, box-shadow 0.2s',
              boxShadow: passwordsLoaded ? '0 4px 14px rgba(40,116,166,0.4)' : 'none',
              opacity: passwordsLoaded ? 1 : 0.7
            }}
            disabled={!passwordsLoaded}
            onMouseOver={(e) => { if (passwordsLoaded) { e.target.style.transform = 'translateY(-2px)'; e.target.style.boxShadow = '0 6px 20px rgba(40,116,166,0.5)'; } }}
            onMouseOut={(e) => { if (passwordsLoaded) { e.target.style.transform = 'translateY(0)'; e.target.style.boxShadow = '0 4px 14px rgba(40,116,166,0.4)'; } }}
          >
            {passwordsLoaded ? 'Sign In' : 'Loading...'}
          </button>
          
          <div style={{ marginTop: '24px', textAlign: 'center', color: '#94A3B8', fontSize: '12px' }}>
            <span>Powered by </span>
            <span style={{ fontWeight: '600', color: '#1E3A5F' }}>JAC</span>
            <span> • Strategy | Talent | Results</span>
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
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        background: 'linear-gradient(135deg, #1E3A5F 0%, #2874A6 50%, #1E3A5F 100%)',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' 
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '24px' }}>
            <img src="/logo.png" alt="JAC" style={{ width: '50px', height: 'auto', borderRadius: '8px', backgroundColor: 'white', padding: '4px' }} />
            <span style={{ fontSize: '32px', fontWeight: '800', color: '#FFFFFF', letterSpacing: '-1px' }}>FinMate</span>
          </div>
          <Loader2 size={48} style={{ animation: 'spin 1s linear infinite', color: '#FFFFFF', marginBottom: '16px' }} />
          <div style={{ fontSize: '18px', fontWeight: '600', color: '#FFFFFF' }}>Loading your data...</div>
          <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)', marginTop: '8px' }}>Please wait while we sync with the cloud</div>
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
