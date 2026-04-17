import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import cors from 'cors';
import dotenv from "dotenv";
import knexLib from "knex";
import config from "./knexfile.js";


dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 3001;

app.use(cors());
const knex = knexLib(config[process.env.NODE_ENV || "development"]);
app.use(express.json());

// Configurar armazenamento
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'public', 'uploads');
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});

const upload = multer({ storage });

// Rota de upload
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Nenhum arquivo enviado' });
  }

  res.json({
    fileName: req.file.filename,
    path: `/uploads/${req.file.filename}`,
  });
});

//create new aplication route
app.post("/api/application", async (req, res) => {
  try {
    const data = req.body;

    await knex("job_applications").insert({
      name: data.name,
      job_name: data.job_name,
      number_phone: data.number_phone,
      email: data.email,
      location: data.location,
      neighborhood: data.neighborhood,
      linkedin_url: data.linkedin_url,
      has_previous_application: data.has_previous_application,
      has_experience: data.has_experience,
      salary_intention: data.salary_intention,
      starts: data.starts,
      cv_url: data.cv_url,
    });

    return res
      .status(201)
      .json({ message: "Application created successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

app.listen(PORT, () => {
  console.log(`API rodando na porta ${PORT}`);
});
