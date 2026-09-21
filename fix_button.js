const fs = require('fs');
let c = fs.readFileSync('frontend/src/components/FormularioProveedor.jsx', 'utf8');
c = c.split('<button className="btn-outline" style={{ padding: \\'0.2rem 0.5rem\\'').join('<button type="button" className="btn-outline" style={{ padding: \\'0.2rem 0.5rem\\'');
fs.writeFileSync('frontend/src/components/FormularioProveedor.jsx', c);
