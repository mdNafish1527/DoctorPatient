# DoctorPatient (Expo + Supabase)

## 1. Supabase setup (once)
1. Create a project at supabase.com.
2. SQL Editor: paste and run `supabase/schema.sql` (tables, security rules, functions, sample doctors).
3. Authentication > Providers > Phone: enable it and connect an SMS provider (Twilio, MessageBird, Vonage or TextLocal).
   For a Bangladeshi local SMS gateway, use an Auth "Send SMS" hook. While developing, add "Test phone numbers & OTPs" in the same page.
4. Copy `.env.example` to `.env` and fill in Project URL + anon key (Project Settings > API).

## 2. Run
`npm install` -> `npx expo install --fix` -> `npx expo start` (scan QR in Expo Go)

## 3. Add real doctors
Insert rows into `doctors` (replace the samples), then register each doctor's login number:
`insert into doctor_phones values ('<doctor id>','8801XXXXXXXXX');`
When that number signs in with OTP, the account becomes that doctor automatically. Edit `doctors.slots` to change available times.

## 4. Build for stores
`npm i -g eas-cli` -> `eas build -p android` / `-p ios`
