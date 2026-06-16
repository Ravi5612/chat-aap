# 🚀 Account Migration Guide (Supabase & Expo)

Jab bhi aap apne project ka **Supabase Account** ya **Expo Account** change karte hain, toh kuch bohot zaroori baatein dhyan mein rakhni hoti hain taaki OTA Updates aur Push Notifications theek se kaam karte rahein. Niche sabhi steps detail mein diye gaye hain:

---

## 1️⃣ Supabase Account Change Karne Par Kya Karein?

Agar aapne naya Supabase account ya naya project banaya hai (limit exceed hone par ya kisi aur wajah se), toh yeh steps follow karein:

1. **Naye Keys Copy Karein:** Apne naye Supabase Project ke dashboard mein jayein `Settings -> API` aur wahan se naya **Project URL** aur naya **Anon Key** copy karein.
2. **.env File Update Karein:** Project ki `.env` file mein purane URL/Key ko hatakar naye wale paste karein.
3. **Database Tables Set Karein:** Naye Supabase project ke SQL Editor mein jaakar apne database ke saare tables dobara create karein (aap `create_tables.sql` ya `restore_missing_tables.sql` use kar sakte hain).
4. **⚠️ SABSE ZAROORI STEP (Clear Cache):** 
   Agar aap `.env` file change karne ke baad turant `eas update` chala rahe hain, toh Metro Bundler purani cache utha lega aur app purane Supabase se connect ho jayegi. Isse bachne ke liye hamesha **clear cache** wali command chalayein:
   ```bash
   eas update --branch preview --message "Supabase keys updated" --clear-cache
   ```

---

## 2️⃣ Expo Account Change Karne Par (OTA Support Ke Liye)

Agar aapne naya Expo account banaya hai, toh OTA (Over-The-Air) updates break ho jate hain kyunki phone mein installed app purane account ko dhoondhti hai.

1. **Naye Account Mein Login Karein:**
   Terminal mein check karein ki aap naye account se login hain ya nahi:
   ```bash
   eas whoami
   ```
   Agar login nahi hain toh `eas login` chalayein.

2. **Project Link Karein aur Slug Match Karein:**
   ```bash
   eas init
   ```
   Yeh command aapse naya project link karne ko kahegi aur aapki `app.json` mein naya `projectId` update kar degi.
   **⚠️ BOHT ZAROORI:** Agar aapne Expo website par project banate waqt koi naya naam (`slug`) rakha hai, toh apni `app.json` file mein `"slug"` property ko exactly us naye naam ke barabar zaroor set karein, warna `eas channel:edit` fail ho jayega.

3. **⚠️ Naya APK Build Karein (Bohot Zaroori):**
   Aapke phone mein jo purani App (APK) install hai, uske andar purana `projectId` hardcoded hai. Isliye aap naye account par kitne bhi OTA update push kar lein, wo phone par nahi aayenge.
   **Aapko ek baar naya APK build karke phone mein zaroor install karna padega:**
   ```bash
   eas build -p android --profile preview
   ```
   *Naya APK install karne ke baad hi OTA updates theek se chalenge.*

   **🔥 EAS BUILD FAIL HONE PAR 2 SOLUTIONS (Pro Tips):**
   - **Tip 1 (.gitignore check karein):** Dhyan rahe ki `.gitignore` file me `google-services.json` ignore na ho rahi ho. Agar wo ignore ho gayi toh EAS usko cloud par upload nahi karega aur Gradle Build "unknown error" ke sath fail ho jayega!
   - **Tip 2 (Plugin/Dependency Error):** Agar build me `expo-module-gradle-plugin` jaisa error aaye, toh iska matlab purane packages conflict kar rahe hain. Terminal me `npx expo install --fix` chalayein aur phir `pnpm install` karke lockfile update karein. Build turant theek ho jayega!

4. **Channel aur Branch Link Karein:**
   Kabhi-kabhi Expo mein `preview` channel `preview` branch se disconnected hota hai. Isko theek karne ke liye:
   ```bash
   eas channel:list
   ```
   Agar wahan "No branches are pointed to this channel" likha aaye, toh link karein:
   ```bash
   eas channel:edit preview --branch preview
   ```

---

## 3️⃣ Push Notifications Par Kya Asar Padta Hai?

Jab aap Expo ya Supabase account change karte hain, toh Push Notifications 100% fail ho jate hain. Unhe theek karne ke steps:

1. **Expo Push Tokens Badal Jayenge:**
   Push notification token `projectId` se jura hota hai. Expo account change hone par saare purane Push Tokens bekaar ho jate hain. 
   - **Fix:** Supabase database mein se purane push tokens delete kar dein (ya app automatically login ke waqt naya token generate karke update karegi). User ko app ek baar kholni padegi taaki naya token database mein save ho sake.

2. **Firebase Credentials Expo Mein Upload Karein (FCM V1):**
   Kyunki aapne naya Expo account banaya hai, us naye account ko Firebase ka Push Notification bhejne ka Server Key (FCM V1 key) nahi pata.

   **Step-by-step Fix:**
   1. **Firebase Console** (console.firebase.google.com) par jayein aur apna project open karein.
   2. **Project settings (⚙️ Gear Icon)** -> **Service accounts** tab mein jayein.
   3. Niche scroll karke **"Generate new private key"** par click karein. Ek `.json` file download hogi.
   4. Ab **Expo Dashboard** (expo.dev) par jayein -> Apne naye project me **Credentials** select karein -> **Android**.
   5. Niche **Push Notifications** (FCM V1) wale section me jaakar **Add** par click karein aur us `.json` file ko upload kar dein. Jab tak ye nahi karenge, Android par Push Notifications deliver nahi honge!

---

### 💡 Summary / Golden Rule
Jab bhi koi naya account banayein (Expo ya Supabase):
1. **Supabase:** `.env` update karein aur `eas update --clear-cache` chalayein.
2. **Expo:** `eas init` chalayein, naya APK build karein (`eas build`), aur Firebase keys `eas credentials` mein upload karein.
