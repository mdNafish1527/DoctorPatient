import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './supabase';
import { DOCTORS } from './data';
const C = createContext();
export const useApp = () => useContext(C);
const plus = p => '+' + String(p || '').replace(/\D/g, '');
export function Provider({ children }) {
  const [session, setSession] = useState(null), [profile, setProfile] = useState(null), [myDoc, setMyDoc] = useState(null);
  const [appts, setAppts] = useState([]), [rx, setRx] = useState([]), [ready, setReady] = useState(false), [, bump] = useState(0);
  const loadDocs = async () => { const { data, error } = await supabase.from('doctors').select('*').order('name'); if (error) console.log('DOCTORS ERROR:', error.message); if (data) { DOCTORS.splice(0, DOCTORS.length, ...data); bump(n => n + 1); } };
  const load = async ses => {
    if (!ses) { setProfile(null); setMyDoc(null); setAppts([]); setRx([]); return {}; }
    const uid = ses.user.id;
    const [d, p, a, r] = await Promise.all([
      supabase.from('doctors').select('*').eq('user_id', uid).maybeSingle(),
      supabase.from('profiles').select('*').eq('id', uid).maybeSingle(),
      supabase.from('appointments').select('*, patient:profiles(*)').order('date').order('time'),
      supabase.from('prescriptions').select('*, patient:profiles(*)').order('created_at', { ascending: false }),
    ]);
    setMyDoc(d.data); setProfile(p.data);
    setAppts((a.data || []).map(x => ({ ...x, docId: x.doc_id })));
    setRx((r.data || []).map(x => ({ ...x, docId: x.doc_id, apptId: x.appt_id })));
    return { doc: d.data, prof: p.data };
  };
  useEffect(() => {
    loadDocs();
    supabase.auth.getSession().then(async ({ data }) => { setSession(data.session); await load(data.session); setReady(true); }).catch(() => setReady(true));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, ses) => { setSession(ses); if (!ses) setTimeout(() => load(null), 0); });
    return () => sub.subscription.unsubscribe();
  }, []);
  const cur = async () => (await supabase.auth.getSession()).data.session;
  const act = {
    refresh: async () => { loadDocs(); load(await cur()); },
    sendOtp: phone => supabase.auth.signInWithOtp({ phone }),
    verifyOtp: async (phone, token) => {
      const { data, error } = await supabase.auth.verifyOtp({ phone, token, type: 'sms' });
      if (error) return { error };
      await supabase.rpc('claim_doctor'); // links this login to a doctor profile if the phone is registered as a doctor
      const r = await load(data.session);
      return { hasAccount: !!(r.doc || r.prof) };
    },
    saveProfile: async f => {
      const ses = await cur();
      const { error } = await supabase.from('profiles').upsert({ id: ses.user.id, name: f.name.trim(), age: Number(f.age), gender: f.gender, blood: f.blood || null, address: f.address.trim(), phone: plus(ses.user.phone) });
      if (error) return error.message; await load(ses); return null;
    },
    takenSlots: async (doc, date) => { const { data } = await supabase.rpc('taken_slots', { p_doc: doc, p_date: date }); return data || []; },
    book: async (docId, date, time, mode) => {
      const ses = await cur();
      const { error } = await supabase.from('appointments').insert({ doc_id: docId, date, time, mode, patient_id: ses.user.id });
      if (error) return error.code === '23505' ? 'That slot was just taken. Please choose another.' : error.message;
      await load(ses); return null;
    },
    cancel: async id => { await supabase.rpc('cancel_appointment', { p_id: id }); await load(await cur()); },
    sendRx: async x => {
      const ses = await cur();
      const { error } = await supabase.from('prescriptions').insert({ appt_id: x.apptId, doc_id: x.docId, patient_id: x.patientId, dx: x.dx, adv: x.adv, meds: x.meds });
      if (error) return error.message; await load(ses); return null;
    },
    signOut: async () => { await supabase.auth.signOut(); await load(null); },
  };
  const role = myDoc ? 'doctor' : session && profile ? 'patient' : null;
  const s = { role, docId: myDoc?.id, appts, rx, user: myDoc ? { name: myDoc.name, phone: plus(session?.user.phone) } : profile };
  return <C.Provider value={{ s, act, ready, session }}>{children}</C.Provider>;
}
