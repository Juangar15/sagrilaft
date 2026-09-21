import re

with open('backend/server.js', 'r', encoding='utf-8') as f:
    c = f.read()

c = re.sub(
    r'if \(!email\) return res.status\(400\).json\(\{ error: [^\}]+\}\);',
    '''if (!email || email.trim() === "") { 
        console.error("OTP fail, empty email. body:", req.body); 
        return res.status(400).json({ error: "Falta correo electronico" }); 
    }
    console.log("OTP SEND -> email:", email, "type:", typeof email, "body:", req.body);''',
    c
)

with open('backend/server.js', 'w', encoding='utf-8') as f:
    f.write(c)
