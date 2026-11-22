import React, { useState, useEffect } from 'react';
import { SafeAreaView, View, Text, ScrollView, TouchableOpacity as T, Alert, StatusBar, Linking, Platform } from 'react-native';
import { Provider, useApp } from './store';
import { DOCTORS, SPECIALTIES, LOCATIONS, days } from './data';
import { c, Btn, Card, Chip, Inp, H, Tx, Stars } from './ui';

const dn = id => DOCTORS.find(d => d.id === id);
const today = () => new Date().toISOString().slice(0, 10);
const Row = ({ k, v }) => <View style={{ flexDirection:'row', marginVertical:2 }}><Tx m s={{ width:95 }}>{k}</Tx><Tx s={{ flex:1, fontWeight:'600' }}>{v || '—'}</Tx></View>;
const Scroll = ({ children }) => <ScrollView contentContainerStyle={{ padding:16, paddingBottom:40 }} keyboardShouldPersistTaps="handled">{children}</ScrollView>;
const Strip = ({ data, sel, set }) => <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom:4 }}>{data.map(x => <Chip key={x} label={x} on={sel === x} onPress={() => set(sel === x ? null : x)} />)}</ScrollView>;
const Gate = ({ go, msg }) => <Scroll><H>Sign in required</H><Tx m s={{ marginBottom:10 }}>{msg}</Tx><Btn title="Register / Sign in" onPress={() => go('auth', { role:'patient' })} /></Scroll>;
const PatientInfo = ({ p }) => <View><Row k="Name" v={p.name} /><Row k="Age / Sex" v={`${p.age} / ${p.gender}`} /><Row k="Blood group" v={p.blood} /><Row k="Phone" v={p.phone} /><Row k="Address" v={p.address} /></View>;

function Home({ go }) {
  const [intl, setIntl] = useState(false), [q, setQ] = useState(''), [sp, setSp] = useState(null), [lc, setLc] = useState(null);
  const L = DOCTORS.filter(d => d.intl === intl && (!sp || d.spec === sp) && (!lc || d.loc === lc) && (d.name + d.spec + d.hosp + d.loc).toLowerCase().includes(q.toLowerCase()));
  return <Scroll>
    <H s={{ fontSize:26, color:c.p }}>DoctorPatient</H>
    <Tx m>Find trusted doctors and book in minutes</Tx>
    <View style={{ flexDirection:'row', marginVertical:10 }}>
      <Chip label="Bangladeshi Doctors" on={!intl} onPress={() => { setIntl(false); setLc(null); }} />
      <Chip label="International (Online)" on={intl} onPress={() => { setIntl(true); setLc(null); }} />
    </View>
    <Inp placeholder="Search doctor, speciality, hospital, city…" value={q} onChangeText={setQ} />
    <Strip data={SPECIALTIES} sel={sp} set={setSp} />
    {!intl && <Strip data={LOCATIONS} sel={lc} set={setLc} />}
    {intl && <Tx m s={{ marginVertical:6 }}>International doctors are available for online video consultation only.</Tx>}
    <Tx m s={{ marginVertical:6 }}>{L.length} doctor(s) found</Tx>
    {L.map(d => <Card key={d.id} onPress={() => go('doc', { id:d.id })}>
      <Tx s={{ fontSize:16, fontWeight:'800' }}>{d.name}</Tx>
      <Tx s={{ color:c.p, fontWeight:'600' }}>{d.spec} · {d.deg}</Tx>
      <Tx m>{d.hosp}, {d.loc}</Tx>
      <View style={{ flexDirection:'row', justifyContent:'space-between', marginTop:6 }}><Stars r={d.rating} n={d.reviews} /><Tx s={{ fontWeight:'700' }}>{d.fee} {d.cur}</Tx></View>
    </Card>)}
  </Scroll>;
}

function Doc({ id, go, reset }) {
  const { s, act } = useApp(); const d = dn(id); const D = days();
  const [date, setDate] = useState(D[0]), [time, setTime] = useState(null), [taken, setTaken] = useState([]);
  const loadTaken = () => act.takenSlots(id, date).then(setTaken);
  useEffect(() => { loadTaken(); }, [date]);
  const book = async () => {
    if (s.role !== 'patient') return go('auth');
    if (!time) return Alert.alert('Please select a time slot');
    const err = await act.book(id, date, time, d.intl ? 'online' : 'in-person');
    if (err) { setTime(null); loadTaken(); return Alert.alert('Could not book', err); }
    Alert.alert('Appointment booked', `${d.name}\n${date} at ${time}\n` + (d.intl ? 'Join the video consultation from Appointments.' : `Please pay ${d.fee} ${d.cur} at the clinic.`));
    reset('visits');
  };
  return <Scroll>
    <Card>
      <Tx s={{ fontSize:20, fontWeight:'800' }}>{d.name}</Tx>
      <Tx s={{ color:c.p, fontWeight:'700' }}>{d.spec}</Tx>
      <View style={{ marginVertical:6 }}><Stars r={d.rating} n={d.reviews} /></View>
      <Row k="Degrees" v={d.deg} /><Row k="Experience" v={`${d.exp} years`} /><Row k="Hospital" v={d.hosp} /><Row k="Location" v={d.loc} />
      <Row k="Languages" v={d.lang} /><Row k="Consultation" v={d.intl ? 'Online video' : 'In-person'} />
      <Row k="Fee" v={`${d.fee} ${d.cur}` + (d.intl ? '' : ' (pay in hand)')} />
      <Tx m s={{ marginTop:8 }}>{d.name} is an experienced {d.spec.toLowerCase()} specialist with {d.exp} years of clinical practice.</Tx>
    </Card>
    <H>Available slots</H>
    <Strip data={D} sel={date} set={x => { setDate(x || date); setTime(null); }} />
    <View style={{ flexDirection:'row', flexWrap:'wrap', marginTop:6 }}>
      {(d.slots || []).map(t => taken.includes(t)
        ? <View key={t} style={{ padding:10, borderRadius:10, marginRight:8, marginBottom:8, backgroundColor:'#E8EEF0' }}><Text style={{ color:c.m, textDecorationLine:'line-through' }}>{t}</Text></View>
        : <Chip key={t} label={t} on={time === t} onPress={() => setTime(t)} />)}
    </View>
    <Btn title={s.role === 'patient' ? 'Confirm appointment' : 'Sign in to book'} onPress={book} />
  </Scroll>;
}

function Visits({ go }) {
  const { s, act } = useApp(); const isD = s.role === 'doctor';
  if (!s.role) return <Gate go={go} msg="Sign in to see your appointments." />;
  const L = [...s.appts].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  const cancel = id => act.cancel(id);
  return <Scroll>
    <H>{isD ? 'My patients' : 'My appointments'}</H>
    {!L.length && <Tx m>No appointments yet.</Tx>}
    {L.map(a => { const d = dn(a.docId), r = s.rx.find(x => x.apptId === a.id); return <Card key={a.id}>
      <View style={{ flexDirection:'row', justifyContent:'space-between' }}>
        <Tx s={{ fontWeight:'800' }}>{a.date} · {a.time}</Tx>
        <Tx s={{ color: a.status === 'booked' ? c.p : a.status === 'completed' ? c.ok : c.err, fontWeight:'700' }}>{a.status.toUpperCase()}</Tx>
      </View>
      {isD ? <View style={{ marginTop:6 }}><PatientInfo p={a.patient} /></View> : <View style={{ marginTop:4 }}><Tx>{d.name} · {d.spec}</Tx><Tx m>{a.mode === 'online' ? 'Online video consultation' : `${d.hosp}, ${d.loc}`}</Tx></View>}
      {!isD && a.mode === 'online' && a.status === 'booked' && <Btn title="Join video call" onPress={() => Linking.openURL('https://meet.jit.si/DoctorPatient-' + a.id)} />}
      {isD && a.status !== 'cancelled' && (r ? <Btn kind="o" title="View prescription" onPress={() => go('rxview', { id:r.id })} /> : <Btn title="Write prescription" onPress={() => go('rxform', { id:a.id })} />)}
      {!isD && a.status === 'booked' && <Btn kind="x" title="Cancel appointment" onPress={() => cancel(a.id)} />}
    </Card>; })}
  </Scroll>;
}

function RxForm({ id, back }) {
  const { s, act } = useApp(); const a = s.appts.find(x => x.id === id);
  const [dx, setDx] = useState(''), [adv, setAdv] = useState(''), [m, setM] = useState([{ n:'', d:'', t:'' }]);
  const set = (i, k, v) => setM(m.map((x, j) => j === i ? { ...x, [k]:v } : x));
  const save = async () => {
    if (!dx.trim() || !m[0].n.trim()) return Alert.alert('Add a diagnosis and at least one medicine');
    const e = await act.sendRx({ apptId:id, docId:a.docId, patientId:a.patient_id, dx, adv, meds:m.filter(x => x.n.trim()) });
    if (e) return Alert.alert('Could not save', e);
    Alert.alert('Prescription sent', 'It now appears in the patient dashboard.'); back();
  };
  return <Scroll>
    <H>New prescription</H>
    <Card><Tx m s={{ marginBottom:4 }}>Patient details (auto-filled from profile)</Tx><PatientInfo p={a.patient} /></Card>
    <Inp placeholder="Diagnosis" value={dx} onChangeText={setDx} />
    <H s={{ fontSize:15 }}>Medicines</H>
    {m.map((x, i) => <Card key={i}>
      <Inp placeholder="Medicine name" value={x.n} onChangeText={v => set(i, 'n', v)} />
      <Inp placeholder="Dose (e.g. 1+0+1 after meal)" value={x.d} onChangeText={v => set(i, 'd', v)} />
      <Inp placeholder="Duration (e.g. 7 days)" value={x.t} onChangeText={v => set(i, 't', v)} />
    </Card>)}
    <Btn kind="o" title="+ Add medicine" onPress={() => setM([...m, { n:'', d:'', t:'' }])} />
    <Inp placeholder="Advice / follow-up" value={adv} onChangeText={setAdv} multiline style={{ minHeight:80 }} />
    <Btn title="Send prescription to patient" onPress={save} />
  </Scroll>;
}

function RxView({ id }) {
  const { s } = useApp(); const r = s.rx.find(x => x.id === id); const d = dn(r.docId);
  return <Scroll><Card>
    <Tx s={{ fontSize:20, fontWeight:'800', color:c.p }}>DoctorPatient · Prescription</Tx>
    <Tx s={{ fontWeight:'700', marginTop:6 }}>{d.name}</Tx><Tx m>{d.deg} · {d.spec}</Tx><Tx m>Date: {r.date}</Tx>
    <View style={{ height:1, backgroundColor:c.ln, marginVertical:10 }} />
    <PatientInfo p={r.patient} />
    <View style={{ height:1, backgroundColor:c.ln, marginVertical:10 }} />
    <Row k="Diagnosis" v={r.dx} />
    <H s={{ fontSize:15 }}>Rx</H>
    {r.meds.map((x, i) => <Tx key={i} s={{ marginVertical:3 }}>{i + 1}. <Text style={{ fontWeight:'700' }}>{x.n}</Text> — {x.d || '—'} — {x.t || '—'}</Tx>)}
    {!!r.adv && <View style={{ marginTop:8 }}><Tx m>Advice</Tx><Tx>{r.adv}</Tx></View>}
  </Card></Scroll>;
}

function RxList({ go }) {
  const { s } = useApp();
  if (s.role !== 'patient') return <Gate go={go} msg="Sign in to see your prescriptions." />;
  const L = s.rx;
  return <Scroll><H>My prescriptions</H>{!L.length && <Tx m>No prescriptions yet.</Tx>}
    {L.map(r => <Card key={r.id} onPress={() => go('rxview', { id:r.id })}><Tx s={{ fontWeight:'800' }}>{dn(r.docId).name}</Tx><Tx m>{r.date} · {r.dx}</Tx></Card>)}</Scroll>;
}

function Auth({ back }) {
  const { session, act } = useApp();
  const [step, setStep] = useState(session ? 2 : 0), [phone, setPhone] = useState(''), [code, setCode] = useState(''), [busy, setBusy] = useState(false);
  const [f, setF] = useState({ name:'', age:'', gender:'', blood:'', address:'' });
  const k = x => ({ value:f[x], onChangeText:v => setF({ ...f, [x]:v }) });
  const run = async fn => { setBusy(true); try { await fn(); } finally { setBusy(false); } };
  const full = '+' + phone.replace(/\D/g, '');
  const send = () => {
    if (!/^\+\d{10,14}$/.test(full)) return Alert.alert('Enter a valid mobile number with country code, e.g. +8801XXXXXXXXX');
    run(async () => { const { error } = await act.sendOtp(full); if (error) return Alert.alert('Could not send OTP', error.message); setStep(1); });
  };
  const verify = () => run(async () => {
    const { error, hasAccount } = await act.verifyOtp(full, code.trim());
    if (error) return Alert.alert('Incorrect or expired code', error.message);
    hasAccount ? back() : setStep(2);
  });
  const save = () => {
    if (!f.name.trim() || !f.age || !f.gender || !f.address.trim()) return Alert.alert('Please complete your profile');
    run(async () => { const e = await act.saveProfile(f); e ? Alert.alert('Could not save', e) : back(); });
  };
  return <Scroll>
    <H>{step === 0 ? 'Register / Sign in' : step === 1 ? 'Verify your number' : 'Complete your profile'}</H>
    {step === 0 && <View><Inp placeholder="Mobile number (+8801XXXXXXXXX)" keyboardType="phone-pad" value={phone} onChangeText={setPhone} /><Btn dis={busy} title="Send OTP" onPress={send} /></View>}
    {step === 1 && <View><Tx m s={{ marginBottom:8 }}>Enter the 6-digit code sent to {full}. You only verify once.</Tx>
      <Inp placeholder="OTP" keyboardType="number-pad" maxLength={6} value={code} onChangeText={setCode} />
      <Btn dis={busy} title="Verify" onPress={verify} /><Btn kind="o" title="Change number" onPress={() => setStep(0)} /></View>}
    {step === 2 && <View><Inp placeholder="Full name" {...k('name')} /><Inp placeholder="Age" keyboardType="number-pad" {...k('age')} />
      <Strip data={['Male','Female','Other']} sel={f.gender} set={v => setF({ ...f, gender:v || '' })} />
      <Strip data={['A+','A-','B+','B-','O+','O-','AB+','AB-']} sel={f.blood} set={v => setF({ ...f, blood:v || '' })} />
      <Inp placeholder="Address" {...k('address')} /><Btn dis={busy} title="Save & continue" onPress={save} /></View>}
  </Scroll>;
}

function Account({ go }) {
  const { s, act } = useApp();
  if (!s.role) return <Scroll><H>Welcome</H><Tx m s={{ marginBottom:10 }}>Browse freely. Register with a one-time OTP when you book.</Tx>
    <Btn title="Sign in / Register" onPress={() => go('auth')} /></Scroll>;
  return <Scroll><H>Account</H><Card>{s.role === 'doctor' ? <View><Row k="Doctor" v={s.user.name} /><Row k="Phone" v={s.user.phone} /></View> : <PatientInfo p={s.user} />}</Card>
    <Btn kind="x" title="Sign out" onPress={act.signOut} /></Scroll>;
}

function Shell() {
  const { s, ready, act } = useApp(); const [tab, setTab] = useState('home'), [st, setSt] = useState([]);
  if (!ready) return null;
  const go = (n, p = {}) => setSt(x => [...x, { n, ...p }]), back = () => setSt(x => x.slice(0, -1)), reset = t => { setSt([]); setTab(t); };
  const tabs = s.role === 'doctor' ? [['visits','Patients'],['me','Account']] : [['home','Doctors'],['visits','Appointments'],['rx','Prescriptions'],['me','Account']];
  const cur = tabs.some(t => t[0] === tab) ? tab : tabs[0][0], top = st[st.length - 1], P = { go, back, reset };
  const body = top ? { doc:<Doc {...top} {...P} />, auth:<Auth {...top} {...P} />, rxform:<RxForm {...top} {...P} />, rxview:<RxView {...top} /> }[top.n]
    : { home:<Home {...P} />, visits:<Visits {...P} />, rx:<RxList {...P} />, me:<Account {...P} /> }[cur];
  return <SafeAreaView style={{ flex:1, backgroundColor:c.bg, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 }}>
    {top && <T onPress={back} style={{ padding:14 }}><Text style={{ color:c.p, fontWeight:'700' }}>‹ Back</Text></T>}
    <View style={{ flex:1 }}>{body}</View>
    {!top && <View style={{ flexDirection:'row', backgroundColor:c.w, borderTopWidth:1, borderColor:c.ln }}>
      {tabs.map(([key, label]) => <T key={key} onPress={() => { setTab(key); act.refresh(); }} style={{ flex:1, padding:14, alignItems:'center' }}><Text style={{ color: cur === key ? c.p : c.m, fontWeight:'700', fontSize:12 }}>{label}</Text></T>)}
    </View>}
  </SafeAreaView>;
}

export default function App() { return <Provider><Shell /></Provider>; }
