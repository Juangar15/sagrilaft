import re

with open('backend/server.js', 'r', encoding='utf-8') as f:
    c = f.read()

c = re.sub(
    r'if \(!email \|\| email\.trim\(\) === ""\) \{[^\}]+\}',
    r'''if (!email || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        console.error("OTP fail, invalid email:", email);
        return res.status(400).json({ error: "El correo electr?nico proporcionado es inv?lido." });
    }''',
    c
)

with open('backend/server.js', 'w', encoding='utf-8') as f:
    f.write(c)
