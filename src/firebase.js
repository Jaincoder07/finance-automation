// Firebase Configuration
import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, getDoc, collection, getDocs, deleteDoc } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAZZ0804o11q-hS6p7XJZNK_FPGJgXpmPc",
  authDomain: "finance-automation-b28e8.firebaseapp.com",
  projectId: "finance-automation-b28e8",
  storageBucket: "finance-automation-b28e8.firebasestorage.app",
  messagingSenderId: "832501526859",
  appId: "1:832501526859:web:3a64f40f9db732af1b78ce"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Database helper functions
export const saveData = async (collectionName, docId, data) => {
  try {
    await setDoc(doc(db, collectionName, docId), {
      ...data,
      updatedAt: new Date().toISOString()
    });
    return true;
  } catch (error) {
    console.error("Error saving data:", error);
    return false;
  }
};

export const getData = async (collectionName, docId) => {
  try {
    const docSnap = await getDoc(doc(db, collectionName, docId));
    if (docSnap.exists()) {
      return docSnap.data();
    }
    return null;
  } catch (error) {
    console.error("Error getting data:", error);
    return null;
  }
};

export const getAllData = async (collectionName) => {
  try {
    const querySnapshot = await getDocs(collection(db, collectionName));
    const data = [];
    querySnapshot.forEach((doc) => {
      data.push({ id: doc.id, ...doc.data() });
    });
    return data;
  } catch (error) {
    console.error("Error getting all data:", error);
    return [];
  }
};

export const deleteData = async (collectionName, docId) => {
  try {
    await deleteDoc(doc(db, collectionName, docId));
    return true;
  } catch (error) {
    console.error("Error deleting data:", error);
    return false;
  }
};

// App State Management - Save entire app state
export const saveAppState = async (userId, state) => {
  try {
    // Save master data
    await setDoc(doc(db, "appState", userId), {
      masterData: state.masterData || [],
      ledgerEntries: state.ledgerEntries || [],
      receipts: state.receipts || [],
      creditNotes: state.creditNotes || [],
      openingBalances: state.openingBalances || {},
      mailerImages: state.mailerImages || {},
      mailerLogo: state.mailerLogo || null,
      companyConfig: state.companyConfig || {},
      nextInvoiceNo: state.nextInvoiceNo || 1,
      nextCombineNo: state.nextCombineNo || 1,
      nextReceiptNo: state.nextReceiptNo || 1,
      nextCreditNoteNo: state.nextCreditNoteNo || 1,
      invoiceValues: state.invoiceValues || {},
      updatedAt: new Date().toISOString()
    });
    return true;
  } catch (error) {
    console.error("Error saving app state:", error);
    return false;
  }
};

export const loadAppState = async (userId) => {
  try {
    const docSnap = await getDoc(doc(db, "appState", userId));
    if (docSnap.exists()) {
      return docSnap.data();
    }
    return null;
  } catch (error) {
    console.error("Error loading app state:", error);
    return null;
  }
};

export { db, auth, signInWithEmailAndPassword, signOut, onAuthStateChanged };
