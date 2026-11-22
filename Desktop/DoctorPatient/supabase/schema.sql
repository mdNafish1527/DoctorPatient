-- Run this whole file once in Supabase Dashboard > SQL Editor.
create table doctors(id text primary key, name text not null, spec text not null, loc text not null, hosp text, exp int, fee int, cur text default 'BDT',
  rating numeric(2,1) default 0, reviews int default 0, deg text, lang text, intl boolean default false,
  slots text[] default '{09:00,09:30,10:00,10:30,11:00,16:00,16:30,17:00,17:30,18:00}', user_id uuid unique references auth.users on delete set null);
-- Private: the phone each doctor will sign in with (digits only, with country code, e.g. 8801712345678). Not readable by the app.
create table doctor_phones(doc_id text primary key references doctors on delete cascade, phone text not null);
create table profiles(id uuid primary key references auth.users on delete cascade, name text not null, phone text, age int, gender text, blood text, address text);
create table appointments(id uuid primary key default gen_random_uuid(), doc_id text not null references doctors, patient_id uuid not null references profiles on delete cascade,
  date date not null, time text not null, mode text not null, status text not null default 'booked', created_at timestamptz default now());
create unique index one_booking_per_slot on appointments(doc_id, date, time) where status <> 'cancelled';
create table prescriptions(id uuid primary key default gen_random_uuid(), appt_id uuid not null unique references appointments, doc_id text not null references doctors,
  patient_id uuid not null references profiles, dx text not null, adv text, meds jsonb not null, date date default current_date, created_at timestamptz default now());

alter table doctors enable row level security; alter table doctor_phones enable row level security;
alter table profiles enable row level security; alter table appointments enable row level security; alter table prescriptions enable row level security;

create policy doctors_read on doctors for select using (true);
create policy profiles_own on profiles for all using (id = auth.uid()) with check (id = auth.uid());
create policy profiles_doctor_read on profiles for select using (exists (select 1 from appointments a join doctors d on d.id = a.doc_id where a.patient_id = profiles.id and d.user_id = auth.uid()));
create policy appt_read on appointments for select using (patient_id = auth.uid() or exists (select 1 from doctors d where d.id = appointments.doc_id and d.user_id = auth.uid()));
create policy appt_insert on appointments for insert with check (patient_id = auth.uid() and status = 'booked' and date >= current_date);
create policy rx_read on prescriptions for select using (patient_id = auth.uid() or exists (select 1 from doctors d where d.id = prescriptions.doc_id and d.user_id = auth.uid()));
create policy rx_insert on prescriptions for insert with check (exists (select 1 from appointments a join doctors d on d.id = a.doc_id
  where a.id = prescriptions.appt_id and d.user_id = auth.uid() and a.doc_id = prescriptions.doc_id and a.patient_id = prescriptions.patient_id and a.status = 'booked'));

create function taken_slots(p_doc text, p_date date) returns setof text language sql security definer set search_path = public as
$$ select time from appointments where doc_id = p_doc and date = p_date and status <> 'cancelled' $$;
create function cancel_appointment(p_id uuid) returns void language sql security definer set search_path = public as
$$ update appointments set status = 'cancelled' where id = p_id and patient_id = auth.uid() and status = 'booked' $$;
create function complete_appt() returns trigger language plpgsql security definer set search_path = public as
$$ begin update appointments set status = 'completed' where id = new.appt_id; return new; end $$;
create trigger rx_done after insert on prescriptions for each row execute function complete_appt();
create function claim_doctor() returns text language plpgsql security definer set search_path = public as
$$ declare r text; begin
  update doctors d set user_id = auth.uid() from doctor_phones p
  where p.doc_id = d.id and d.user_id is null and p.phone = regexp_replace((select phone from auth.users where id = auth.uid()), '\D', '', 'g')
  returning d.id into r; return r; end $$;
grant execute on function taken_slots(text, date), cancel_appointment(uuid), claim_doctor() to anon, authenticated;

-- SAMPLE doctors: replace with real, verified doctors before launch.
insert into doctors(id,name,spec,loc,hosp,exp,fee,cur,rating,reviews,deg,lang,intl) values
('b1','Dr. Rahman Chowdhury','Cardiology','Dhaka','National Heart Foundation',18,1000,'BDT',4.8,212,'MBBS, MD (Cardiology)','Bangla, English',false),
('b2','Dr. Nusrat Jahan','Gynecology','Dhaka','Square Hospital',14,1200,'BDT',4.9,305,'MBBS, FCPS (Gynae)','Bangla, English',false),
('b3','Dr. Imran Hossain','Neurology','Chattogram','Chattogram Medical College Hospital',16,900,'BDT',4.6,148,'MBBS, MD (Neurology)','Bangla, English',false),
('b4','Dr. Farzana Akter','Dermatology','Dhaka','Labaid Hospital',10,800,'BDT',4.7,189,'MBBS, DDV','Bangla, English',false),
('b5','Dr. Tanvir Ahmed','Orthopedics','Sylhet','North East Medical College',12,800,'BDT',4.5,97,'MBBS, MS (Ortho)','Bangla, English',false),
('b6','Dr. Sabrina Haque','Pediatrics','Rajshahi','Rajshahi Medical College Hospital',9,600,'BDT',4.7,120,'MBBS, DCH','Bangla, English',false),
('b7','Dr. Mahbub Alam','Medicine','Khulna','Khulna City Medical College',20,700,'BDT',4.6,260,'MBBS, FCPS (Medicine)','Bangla, English',false),
('b8','Dr. Shamima Nasrin','ENT','Dhaka','United Hospital',11,1000,'BDT',4.4,76,'MBBS, MS (ENT)','Bangla, English',false),
('i1','Dr. Arvind Menon','Cardiology','Chennai','Multispeciality Hospital',22,1800,'INR',4.9,540,'MBBS, DM (Cardiology)','English, Hindi',true),
('i2','Dr. Priya Sharma','Gynecology','Delhi','Multispeciality Hospital',17,1500,'INR',4.8,410,'MBBS, MS (OBG)','English, Hindi',true),
('i3','Dr. Rohit Verma','Neurology','Mumbai','Multispeciality Hospital',19,2000,'INR',4.7,330,'MBBS, DM (Neurology)','English, Hindi',true),
('i4','Dr. Ananya Iyer','Dermatology','Bengaluru','Multispeciality Hospital',12,1200,'INR',4.7,275,'MBBS, MD (Derm)','English, Hindi',true),
('i5','Dr. Suresh Nair','Orthopedics','Kochi','Multispeciality Hospital',21,1600,'INR',4.6,298,'MBBS, MS (Ortho)','English, Hindi',true),
('i6','Dr. Kavita Rao','Pediatrics','Hyderabad','Multispeciality Hospital',15,1200,'INR',4.8,350,'MBBS, MD (Paeds)','English, Hindi',true),
('i7','Dr. Vikram Singh','Medicine','Delhi','Multispeciality Hospital',24,1500,'INR',4.7,420,'MBBS, MD (Medicine)','English, Hindi',true);
-- Register a doctor's login phone (then they sign in with that number in the app):
-- insert into doctor_phones values ('b1','8801712345678');
