require('dotenv').config();
const express = require('express');
const session = require('express-session');
const { ConfidentialClientApplication } = require('@azure/msal-node');
const path = require('path');
const port = 3000;
const app = express();



app.use(express.static('public')); // Para arquivos estáticos
app.set('views', path.join(__dirname, 'views')); // Configurar o diretório das views
app.set('view engine', 'ejs'); // Usando EJS como engine de template
app.use(session({
    secret: process.env.SECRET_KEY,
    resave: false,
    saveUninitialized: false
}));

// Configurações do Microsoft Entra ID (Azure AD)
const msalConfig = {
    auth: {
        clientId: process.env.CLIENT_ID,
        authority: process.env.AUTHORITY,
        clientSecret: process.env.CLIENT_SECRET
    }
};

const msalClient = new ConfidentialClientApplication(msalConfig);
const authCodeUrlParameters = {
    scopes: ["User.Read"],
    redirectUri: process.env.REDIRECT_URI,
};

app.get('/', (req, res) => {
    // Define 'usuario' como null se não houver sessão de usuário
    const usuario = req.session.user ? req.session.user.name : null;

    // Renderiza a página 'index' passando a variável 'usuario'
    res.render('index', { usuario });
});

app.get('/login', (req, res) => {
    res.render('login');
});

app.get('/getAToken', async (req, res) => {
    const code = req.query.code;
    if (code) {
        try {
            const response = await msalClient.acquireTokenByCode({
                code: code,
                scopes: ['User.Read'],
                redirectUri: process.env.REDIRECT_URI,
            });
            req.session.user = response.idTokenClaims;
            return res.redirect('/');
        } catch (error) {
            console.error('Error acquiring token:', error);
            return res.status(401).send('Autenticação falhou');
        }
    }
    return res.status(401).send('Código não encontrado');
});

app.get('/login_ms', (req, res) => {
    if (!req.session.user) {
        msalClient.getAuthCodeUrl(authCodeUrlParameters)
            .then((authUrl) => {
                res.redirect(authUrl);
            }).catch((error) => console.log(JSON.stringify(error)));
    } else {
        res.redirect('/');
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('https://login.microsoftonline.com/common/oauth2/v2.0/logout?post_logout_redirect_uri=http://localhost:3000/');
    });
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})

