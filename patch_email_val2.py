with open('backend/server.js', 'r', encoding='utf-8') as f:
    c = f.read()

old = '''if (!email || email.trim() === "") { 
        console.error("OTP fail, empty email. body:", req.body); 
        return res.status(400).json({ error: "Falta correo electronico" }); 
    }'''

new = '''if (!email || typeof email !== "string" || !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)) {
        console.error("OTP fail, invalid email:", email);
        return res.status(400).json({ error: "El correo electrónico proporcionado es inválido o está vacío. Por favor vuelva al Paso 2 y asegúrese de escribir un correo válido." });
    }'''

if old in c:
    c = c.replace(old, new)
else:
    print("Not found old string. Dumping server.js context:")
    print(c[c.find('/api/v1/otp/send'):c.find('/api/v1/otp/send')+500])

with open('backend/server.js', 'w', encoding='utf-8') as f:
    f.write(c)
