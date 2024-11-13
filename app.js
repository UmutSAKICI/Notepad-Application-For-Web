import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import bcrypt from "bcrypt";
import passport from "passport";
import { Strategy } from "passport-local";
import GoogleStrategy from "passport-google-oauth2";
import session from "express-session";
import env from "dotenv";
import flash from "connect-flash";
import randomatic from "randomatic";

import { sendMail } from "./mail.js"

const app = express();
const port = 3000;
const saltRounds = 10;
env.config();

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
  })
);

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(express.json());

app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

const db = new pg.Client({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT,
});
db.connect();

app.get("/", async (req, res) => {
  if (req.isAuthenticated()) {
    try {
      const result = await db.query("SELECT * FROM users JOIN notes ON users.email = notes.noteowner WHERE users.email = $1", [req.user.email]);
      const notes = result.rows;

      res.render("notepad.ejs", { myNotes: notes, notedesc: "Önce düzenlemek istediğiniz notu, Notlar kısmından seçiniz." });
    } catch (error) {
      console.log(error);
    }
  } else {
    res.redirect("/signin");
  }
});

app.get("/signin", async (req, res) => {
  const messages = req.flash('error');
  res.render("sign-in.ejs", { messages });
});

app.get("/signup", async (req, res) => {
  res.render("sign-up.ejs", { errorMsg: "" });
});

app.get("/logout", async (req, res) => {
  req.logout(function (err) {
    if (err) {
      return next(err);
    }
    res.redirect("/");
  })
});



app.get(
  "/auth/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
  })
);

app.get(
  "/auth/google/notepad",
  passport.authenticate("google", {
    successRedirect: "/",
    failureRedirect: "/signin"
  })
);

app.post(
  "/login",
  passport.authenticate("local", {
    successRedirect: "/",
    failureRedirect: "/signin",
    failureFlash: true, // Hata mesajları için flash mesajlar kullanılır
  })
);

app.post("/signup", async (req, res) => {
  const { username, email, password } = req.body;

  try {
    const checkResult = await db.query("SELECT * FROM users WHERE email = $1",
      [email]);

    if (checkResult.rows.length > 0) {
      res.render("sign-up.ejs", { errorMsg: "Bu kullanıcı adını veya maili kullanan başkası mevcut." })
    } else {
      bcrypt.hash(password, saltRounds, async (err, hash) => {
        if (err) {
          console.error("Error hashing password: ", err)
        } else {
          const result = await db.query(
            "INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING *",
            [username, email, hash]
          );
          const user = result.rows[0];
          req.login(user, (err) => {
            
            res.redirect("/");
          });
        }
      });
    }
  } catch (error) {
    console.log(error);
  }
});

passport.use(
  "local",
  new Strategy(async function verify(username, password, cb) {
    try {
      const result = await db.query("SELECT * FROM users WHERE username = $1",
        [username]
      );
      if (result.rows.length > 0) {
        const user = result.rows[0];
        const storedHashPassword = user.password;
        bcrypt.compare(password, storedHashPassword, (err, valid) => {
          if (err) {
            console.error("Error comparing passwords:", err);
            return cb(err);
          } else {
            if (valid) {
              return cb(null, user);
            } else {
              return cb(null, false, { invalidInfo: "Kullanıcı adı veya şifre hatalı!" });
            }
          }
        });
      } else {
        return cb(null, false, { message: "Kullanıcı adı veya şifre hatalı!" });
      }
    } catch (error) {
      console.log(error);
      return cb(error);
    }
  })
);

passport.use(
  "google",
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "https://www.peyender.com/auth/google/notepad",
      userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
    },
    async (accessToken, refreshToken, profile, cb) => {
      try {
        console.log(profile);
        const result = await db.query("SELECT * FROM users WHERE email = $1",
          [profile.email]
        );
        if (result.rows.length === 0) {
          const newUser = await db.query(
            "INSERT INTO users (username, email, password) VALUES ($1, $2, $3)",
            [profile.displayName, profile.email, "google"]
          );
          return cb(null, newUser.rows[0]);
        } else {
          return cb(null, result.rows[0]);
        }
      } catch (error) {
        return cb(error);
      }
    }
  )
);

passport.serializeUser((user, cb) => {
  cb(null, user);
});

passport.deserializeUser((user, cb) => {
  cb(null, user);
});


app.get('/reset-password', async (req, res) => {
  res.render("mail.ejs");
});

app.post('/send-mail', async (req, res) => {
  try {
    const randomCode = randomatic('A0A', 5);
    const email = req.body.email;
    req.session.email = email;

    const mailOptions = {
      from: {
        name: 'Çevrimiçi Notepad - Forget Password',
        address: 'ONO'
      },
      to: email,
      subject: "Şifre Sıfırlama Talebi ✔",
      text: 'Şifre sıfırlama talebi aldıysanız aşağıdaki linke tıklayınız..',
      html: `<b>Merhaba değerli kullanıcımız!</b> <br>Şifre sıfırlama için gerekli kod: <b>${randomCode}</b>`,
    };

    const IsThereSuchAUser = await db.query(
      "SELECT * FROM users WHERE email = $1", [req.body.email]);

    if (IsThereSuchAUser.rows.length > 0) {
      await db.query("UPDATE users SET lastcode = $1 WHERE email = $2", [randomCode, req.body.email])

      await sendMail(mailOptions);

      req.session.canAccessMailCode = true;
      req.session.mailCodeAccessTime = Date.now();

      res.redirect('/mail-code');
    } else {
      res.status(404).send("Böyle bir kullanıcı yok!");
    }

  } catch (error) {
    console.log(error);
  }
});

app.get('/mail-code', async (req, res) => {
  const currentTime = Date.now();
  const accessTime = req.session.mailCodeAccessTime;

  if (req.session.canAccessMailCode) {
    if (currentTime - accessTime <= 1 * 60 * 1000) {
      res.render('mail-code.ejs');
      // Bayrağı ve zaman damgasını sıfırla
      req.session.canAccessMailCode = false;
      req.session.mailCodeAccessTime = null;
    } else {
      // Süre dolmuşsa bayrağı sıfırla ve 403 yanıtı ver
      req.session.canAccessMailCode = false;
      req.session.mailCodeAccessTime = null;
      res.status(403).send('Bu sayfaya erişim süresi doldu.');
    }
  } else {
    res.status(403).send('Bu sayfaya doğrudan erişemezsiniz.');
  }
});

app.post('/check-code', async (req, res) => {
  const myMail = req.session.email;  // email bilgisini oturumdan al
  console.log(myMail);

  try {
    const userData = await db.query("SELECT * FROM users WHERE email = $1", [myMail]);
    let userLastCode = [];

    userData.rows.forEach(data => {
      userLastCode.push(data.lastcode);
    });

    const checkCode = req.body.emailcode;
    const newUserLastCode = userLastCode[0];

    if (checkCode === newUserLastCode) {
      console.log("Kodlar eşleşti!");

      // Reset Password sayfasına erişim izni ve zaman damgası
      req.session.canAccessResetPasswordPage = true;
      req.session.resetPasswordPageAccessTime = Date.now();

      res.redirect('/resetpasswordpage');
    } else {
      res.status(403).send('Bu sayfaya erişemezsiniz..');
    }
  } catch (error) {
    console.log(error);
  }
});

app.get('/resetpasswordpage', async (req, res) => {
  const currentTime = Date.now();
  const accessTime = req.session.resetPasswordPageAccessTime;

  if (req.session.canAccessResetPasswordPage) {
    if (currentTime - accessTime <= 2 * 60 * 1000) {
      res.render('mail-resetpassword.ejs')
    } else {
      req.session.canAccessResetPasswordPage = false;
      req.session.resetPasswordPageAccessTime = null;
      res.status(403).send('Bu sayfaya erişim süresi doldu.')
    }
  } else {
    res.status(403).send('Bu sayfaya doğrudan erişemezsiniz.');
  }
});

app.post('/newPassword', async (req, res) => {
  const myMail = req.session.email;  // email bilgisini oturumdan al
  console.log(myMail);

  try {
    const pass1 = req.body.rpass1;
    const pass2 = req.body.rpass2;

    if (pass1 === pass2) {
      bcrypt.hash(pass1, saltRounds, async (err, hash) => {
        if (err) {
          console.error("Error hashing password: ", err)
        } else {
          await db.query(
            "UPDATE users SET password = $1 WHERE email = $2",
            [hash, myMail]
          );
          res.redirect('/signin');
        }
      });
    } else {
      res.status(403).send('Şifreler aynı değil!');
    }
  } catch (err) {
    console.log(err);
  }

});

// PROFILE
app.get("/profile", async (req, res) => {
  res.render("profile.ejs");
  // if (req.isAuthenticated()) {
  //   try {
  //     const result = await db.query("SELECT * FROM users WHERE email = $1", [req.user.email]);
  //     const user = result.rows[0];
  //     console.log(user.username);
  //     // ÖNEMLİ!!!!!!!!!!!!!!!!!!!!!!
  //     // Kullanıcı bilgilerini user değişkeni üzerinden halledeceğiz unutma!

  //     res.render("profile.ejs", { user: user });

  //   } catch (error) {
  //     console.log(error);
  //   }
  // } else {
  //   res.redirect("/signin")
  // }
}); 

//With Forms
app.post("/newNote", async (req, res) => {

  if (req.isAuthenticated()) {
    const newNoteName = req.body.nameinput;

    try {
      await db.query(
        "INSERT INTO notes (notename, noteowner) VALUES ($1, $2) RETURNING *",
        [newNoteName, req.user.email]
      );

      res.redirect("/");
    } catch (error) {
      console.log(error);
    }
  } else {
    res.redirect('/signin')
  }


});

app.post("/changeNoteName", async (req, res) => {
  if (req.isAuthenticated()) {
    const newName = req.body.editnameinput;
    const noteName = req.body.secenek;
    try {
      await db.query("UPDATE notes SET notename = $1 WHERE id = $2", [newName, noteName]);

      res.redirect("/")
    } catch (error) {
      console.log(error);
    }
  } else {
    res.redirect('/signin')
  }


})

app.post("/deleteNote", async (req, res) => {
  if (req.isAuthenticated()) {
    const deleteNote = req.body.secenek;
    console.log(deleteNote);

    try {
      await db.query("DELETE FROM notes WHERE id = $1", [deleteNote]);

      res.redirect("/");
    } catch (error) {
      console.log(error);
    }
  } else {
    res.redirect('/signin')
  }


});

//Fetch Update
app.get('/notes/:id', async (req, res) => {
  if (req.isAuthenticated()) {
    const id = req.params.id;


    try {
      const result = await db.query("SELECT * FROM notes WHERE id = $1", [id]);
      if (result.rows.length > 0) {
        res.json({ notedesc: result.rows[0].notedesc, notename: result.rows[0].notename });
      } else {
        res.status(404).json({ message: 'Not found' });
      }
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Server error' });
    }
  } else {
    res.redirect('/signin')
  }



});

app.post('/notes/update', async (req, res) => {
  if (req.isAuthenticated()) {
    try {
      const { id, notedesc } = req.body;


      const result = await db.query(
        'UPDATE notes SET notedesc = $1 WHERE id = $2',
        [notedesc, id]
      );

      if (result.rowCount > 0) {
        res.json({ message: 'Note updated successfully' });
      } else {
        res.status(404).json({ message: 'Note not found' });
      }
    } catch (err) {
      console.error('Error updating note:', err);
      res.status(500).json({ message: 'Server error' });
    }
  } else {
    res.redirect('/signin')
  }
});

app.listen(port, () => {
  console.log("sunucu başlatıldı.");
});

