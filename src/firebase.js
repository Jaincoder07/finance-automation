// Firebase Configuration - FIXED VERSION
// Fixes: 1) Chunked image storage (avoids 1MB Firestore limit)
//        2) Separate image collection (prevents data loss)
//        3) Real-time listener support

import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, getDoc, collection, getDocs, deleteDoc, onSnapshot, writeBatch, query, where } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged, setPersistence, browserLocalPersistence } from "firebase/auth";

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

// Set auth persistence to local (survives refresh)
setPersistence(auth, browserLocalPersistence).catch(console.error);

// ============================================
// DATABASE HELPER FUNCTIONS
// ============================================

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

// ============================================
// IMAGE STORAGE - SEPARATE COLLECTION
// Stores each image as its own document to avoid 1MB limit
// ============================================

const IMAGE_COLLECTION = "mailerImages";
const LOGO_COLLECTION = "appLogos";

// Save a single mailer image to its own document
const saveMailerImage = async (userId, imageKey, imageIndex, base64Data) => {
  try {
    const docId = `${userId}_${imageKey}_${imageIndex}`;
    await setDoc(doc(db, IMAGE_COLLECTION, docId), {
      userId,
      imageKey,
      imageIndex,
      data: base64Data,
      updatedAt: new Date().toISOString()
    });
    return true;
  } catch (error) {
    console.error(`Error saving image ${imageKey}[${imageIndex}]:`, error);
    return false;
  }
};

// Save all mailer images (diff-based - only saves changed images)
export const saveMailerImages = async (userId, mailerImages) => {
  try {
    if (!mailerImages || typeof mailerImages !== 'object') return true;

    // First, get existing image document IDs so we can clean up deleted ones
    const existingDocs = await getDocs(collection(db, IMAGE_COLLECTION));
    const existingIds = new Set();
    existingDocs.forEach(d => {
      if (d.data().userId === userId) {
        existingIds.add(d.id);
      }
    });

    const newIds = new Set();

    // Save each image as a separate document
    for (const [imageKey, images] of Object.entries(mailerImages)) {
      if (!Array.isArray(images)) continue;
      for (let i = 0; i < images.length; i++) {
        const docId = `${userId}_${imageKey}_${i}`;
        newIds.add(docId);
        
        // Only save if this is a new image (not already in Firestore)
        if (!existingIds.has(docId)) {
          await saveMailerImage(userId, imageKey, i, images[i]);
        }
      }
    }

    // Delete images that no longer exist in state
    for (const existingId of existingIds) {
      if (!newIds.has(existingId)) {
        await deleteDoc(doc(db, IMAGE_COLLECTION, existingId));
      }
    }

    return true;
  } catch (error) {
    console.error("Error saving mailer images:", error);
    return false;
  }
};

// Load all mailer images for a user
export const loadMailerImages = async (userId) => {
  try {
    const snapshot = await getDocs(collection(db, IMAGE_COLLECTION));
    const images = {};
    
    snapshot.forEach(d => {
      const data = d.data();
      if (data.userId !== userId) return;
      
      if (!images[data.imageKey]) {
        images[data.imageKey] = [];
      }
      // Store at correct index
      images[data.imageKey][data.imageIndex] = data.data;
    });

    // Clean up any sparse arrays (remove undefined slots)
    for (const key of Object.keys(images)) {
      images[key] = images[key].filter(Boolean);
    }

    return images;
  } catch (error) {
    console.error("Error loading mailer images:", error);
    return {};
  }
};

// Save logo separately
export const saveMailerLogo = async (userId, logoBase64) => {
  try {
    if (!logoBase64) return true;
    await setDoc(doc(db, LOGO_COLLECTION, userId), {
      data: logoBase64,
      updatedAt: new Date().toISOString()
    });
    return true;
  } catch (error) {
    console.error("Error saving logo:", error);
    return false;
  }
};

// Load logo
export const loadMailerLogo = async (userId) => {
  try {
    const docSnap = await getDoc(doc(db, LOGO_COLLECTION, userId));
    if (docSnap.exists()) {
      return docSnap.data().data;
    }
    return null;
  } catch (error) {
    console.error("Error loading logo:", error);
    return null;
  }
};

// ============================================
// APP STATE MANAGEMENT - WITHOUT IMAGES
// Images are stored separately to avoid 1MB limit
// ============================================

export const saveAppState = async (userId, state) => {
  try {
    // Build the state object WITHOUT images and logo (they're stored separately)
    const stateToSave = {
      masterData: state.masterData || [],
      servicesData: state.servicesData || [],
      ledgerEntries: state.ledgerEntries || [],
      receipts: state.receipts || [],
      creditNotes: state.creditNotes || [],
      openingBalances: state.openingBalances || {},
      // DO NOT include mailerImages here - stored separately!
      // DO NOT include mailerLogo here - stored separately!
      companyConfig: state.companyConfig || {},
      nextInvoiceNo: state.nextInvoiceNo || 1,
      nextCombineNo: state.nextCombineNo || 1,
      nextReceiptNo: state.nextReceiptNo || 1,
      nextCreditNoteNo: state.nextCreditNoteNo || 1,
      nextServiceInvoiceNo: state.nextServiceInvoiceNo || 1,
      invoiceValues: state.invoiceValues || {},
      notifications: state.notifications || [],
      emailSettings: state.emailSettings || {},
      whatsappSettings: state.whatsappSettings || {},
      partyMaster: state.partyMaster || {},
      followups: state.followups || [],
      userPasswords: state.userPasswords || {},
      updatedAt: new Date().toISOString()
    };

    // Check estimated size before saving
    const stateStr = JSON.stringify(stateToSave);
    const estimatedSize = new Blob([stateStr]).size;
    
    if (estimatedSize > 900000) {
      // If state is still too large (close to 1MB), save in chunks
      console.warn(`State size is ${(estimatedSize / 1024).toFixed(0)}KB - splitting into chunks`);
      await saveAppStateChunked(userId, stateToSave);
    } else {
      await setDoc(doc(db, "appState", userId), stateToSave);
    }

    return true;
  } catch (error) {
    console.error("Error saving app state:", error);
    // If save fails due to size, try chunked save
    if (error.code === 'invalid-argument' || error.message?.includes('exceeds the maximum')) {
      console.warn("Document too large, falling back to chunked save...");
      try {
        await saveAppStateChunked(userId, state);
        return true;
      } catch (chunkError) {
        console.error("Chunked save also failed:", chunkError);
      }
    }
    return false;
  }
};

// Chunked save for when main state exceeds 1MB
const saveAppStateChunked = async (userId, state) => {
  // Split large arrays across multiple documents
  const chunk1 = {
    masterData: state.masterData || [],
    servicesData: state.servicesData || [],
    companyConfig: state.companyConfig || {},
    nextInvoiceNo: state.nextInvoiceNo || 1,
    nextCombineNo: state.nextCombineNo || 1,
    nextReceiptNo: state.nextReceiptNo || 1,
    nextCreditNoteNo: state.nextCreditNoteNo || 1,
    nextServiceInvoiceNo: state.nextServiceInvoiceNo || 1,
    emailSettings: state.emailSettings || {},
    whatsappSettings: state.whatsappSettings || {},
    userPasswords: state.userPasswords || {},
    updatedAt: state.updatedAt,
    isChunked: true
  };

  const chunk2 = {
    ledgerEntries: state.ledgerEntries || [],
    receipts: state.receipts || [],
    creditNotes: state.creditNotes || [],
    openingBalances: state.openingBalances || {},
    invoiceValues: state.invoiceValues || {},
    partyMaster: state.partyMaster || {},
    notifications: state.notifications || [],
    followups: state.followups || [],
    updatedAt: state.updatedAt,
    isChunk2: true
  };

  await setDoc(doc(db, "appState", userId), chunk1);
  await setDoc(doc(db, "appState", `${userId}_chunk2`), chunk2);
};

// Load app state (handles both chunked and non-chunked, with legacy image migration)
export const loadAppState = async (userId) => {
  try {
    const docSnap = await getDoc(doc(db, "appState", userId));
    if (!docSnap.exists()) return null;

    let data = docSnap.data();

    // If data was saved in chunks, load chunk2 as well
    if (data.isChunked) {
      const chunk2Snap = await getDoc(doc(db, "appState", `${userId}_chunk2`));
      if (chunk2Snap.exists()) {
        const chunk2Data = chunk2Snap.data();
        data = { ...data, ...chunk2Data };
      }
    }

    // Load images from separate collections (new format)
    let mailerImages = await loadMailerImages(userId);
    let mailerLogo = await loadMailerLogo(userId);

    // ============================================
    // MIGRATION: If separate collections are empty but main document has images,
    // use the legacy images and migrate them to the new separate collections
    // ============================================
    const hasNewImages = mailerImages && Object.keys(mailerImages).length > 0;
    const hasLegacyImages = data.mailerImages && typeof data.mailerImages === 'object' && Object.keys(data.mailerImages).length > 0;
    
    if (!hasNewImages && hasLegacyImages) {
      console.log('🔄 MIGRATION: Found legacy images in main document, migrating to separate collection...');
      mailerImages = data.mailerImages;
      
      // Migrate to new separate collection in background
      try {
        await saveMailerImages(userId, mailerImages);
        console.log('✅ MIGRATION: Legacy images migrated to separate collection successfully');
      } catch (migrationError) {
        console.warn('⚠️ MIGRATION: Could not migrate images (will retry next load):', migrationError);
      }
    }

    // Same for logo
    if (!mailerLogo && data.mailerLogo) {
      console.log('🔄 MIGRATION: Found legacy logo in main document, migrating...');
      mailerLogo = data.mailerLogo;
      
      try {
        await saveMailerLogo(userId, mailerLogo);
        console.log('✅ MIGRATION: Legacy logo migrated successfully');
      } catch (migrationError) {
        console.warn('⚠️ MIGRATION: Could not migrate logo:', migrationError);
      }
    }

    return {
      ...data,
      mailerImages: mailerImages || {},
      mailerLogo: mailerLogo || null
    };
  } catch (error) {
    console.error("Error loading app state:", error);
    return null;
  }
};

// Real-time listener for app state changes
// NOTE: Does NOT handle mailerImages/mailerLogo - those are loaded once on init
// and saved separately to avoid race conditions
export const subscribeToAppState = (userId, callback) => {
  const docRef = doc(db, "appState", userId);
  return onSnapshot(docRef, async (docSnapshot) => {
    if (docSnapshot.exists()) {
      let data = docSnapshot.data();
      
      // If chunked, also load chunk2
      if (data.isChunked) {
        const chunk2Snap = await getDoc(doc(db, "appState", `${userId}_chunk2`));
        if (chunk2Snap.exists()) {
          data = { ...data, ...chunk2Snap.data() };
        }
      }

      // DO NOT load or pass mailerImages/mailerLogo here.
      // They are managed separately to avoid the race condition where:
      // 1) State save triggers listener
      // 2) Listener loads images from separate collection (not yet saved)
      // 3) Gets empty result → overwrites in-memory images → images vanish

      callback(data);
    }
  }, (error) => {
    console.error("Error in real-time listener:", error);
  });
};

export { db, auth, signInWithEmailAndPassword, signOut, onAuthStateChanged };
