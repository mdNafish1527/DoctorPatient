export const SPECIALTIES = ['Cardiology','Gynecology','Neurology','Dermatology','Orthopedics','Pediatrics','Medicine','ENT'];
export const LOCATIONS = ['Dhaka','Chattogram','Sylhet','Rajshahi','Khulna'];
export const DOCTORS = []; // filled from Supabase (see store.js)
export const days = (n = 4) => Array.from({ length: n }, (_, i) => { const d = new Date(); d.setDate(d.getDate() + i + 1); return d.toISOString().slice(0, 10); });
