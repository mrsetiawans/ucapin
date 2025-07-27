// script.js

// Impor library Gemini dari CDN Google
import { GoogleGenerativeAI } from "https://esm.run/@google/generative-ai";

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('ucapan-form');
    const generateBtn = document.getElementById('generate-btn');
    const loader = document.getElementById('loader');
    const previewFrame = document.getElementById('preview-frame');
    const previewPlaceholder = document.getElementById('preview-placeholder');
    const resultActions = document.querySelector('.result-actions');
    const copyBtn = document.getElementById('copy-btn');
    const downloadBtn = document.getElementById('download-btn');
    const copyFeedback = document.getElementById('copy-feedback');

    let generatedHtml = '';

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Tampilkan loader
        loader.style.display = 'block';
        generateBtn.disabled = true;
        generateBtn.textContent = 'Membuat...';
        resultActions.style.display = 'none';
        previewFrame.style.display = 'none';
        previewPlaceholder.style.display = 'block';

        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        const { apiKey, name, sender, date, theme, vibe } = data;

        if (!apiKey) {
            alert("Harap masukkan Google Gemini API Key Anda.");
            resetUI();
            return;
        }

        try {
            // 1. Ambil template HTML
            const templateResponse = await fetch(`themes/${theme}.html`);
            if (!templateResponse.ok) throw new Error(`Tidak bisa memuat template tema: ${theme}.html`);
            let templateHtml = await templateResponse.text();
            
            // 2. Buat prompt dan panggil API Gemini
            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({ model: "gemini-pro" });
            
            const prompt = `
                Buatlah ucapan ulang tahun dengan tema "${theme}" dan nuansa "${vibe}" untuk seseorang bernama "${name}" dari "${sender}".
                Tolong berikan output dalam format JSON yang ketat, tanpa markdown atau teks tambahan.
                Struktur JSON harus seperti ini:
                {
                  "title": "Judul utama yang puitis dan sesuai tema",
                  "subtitle": "Sub-judul yang menyebut nama penerima",
                  "message1": "Paragraf pertama ucapan selamat ulang tahun.",
                  "message2": "Paragraf kedua berisi harapan dan doa.",
                  "message3": "Paragraf ketiga berisi penutup yang hangat.",
                  "specialWish": "Sebuah doa panjang yang sangat mendalam dan puitis, gunakan tag <br> untuk baris baru. Ini akan ditampilkan terpisah."
                }
            `;
            
            const result = await model.generateContent(prompt);
            const responseText = await result.response.text();
            const aiData = JSON.parse(responseText.replace(/```json/g, '').replace(/```/g, '').trim());

            // 3. Ganti placeholder di template
            const [year, month, day] = date.split('-');
            
            generatedHtml = templateHtml
                .replaceAll('{{NAME}}', name)
                .replaceAll('{{SENDER}}', sender)
                .replaceAll('{{TITLE}}', aiData.title)
                .replaceAll('{{SUBTITLE}}', aiData.subtitle)
                .replaceAll('{{MESSAGE_1}}', aiData.message1)
                .replaceAll('{{MESSAGE_2}}', aiData.message2)
                .replaceAll('{{MESSAGE_3}}', aiData.message3)
                .replaceAll('{{SPECIAL_WISH}}', aiData.specialWish)
                .replaceAll('{{YEAR}}', year)
                .replaceAll('{{MONTH}}', month)
                .replaceAll('{{DAY}}', day);

            // 4. Tampilkan preview
            previewPlaceholder.style.display = 'none';
            previewFrame.srcdoc = generatedHtml;
            previewFrame.style.display = 'block';
            resultActions.style.display = 'flex';

        } catch (error) {
            console.error(error);
            alert('Terjadi kesalahan. Pastikan API Key valid dan coba lagi. Detail: ' + error.message);
        } finally {
            resetUI();
        }
    });

    function resetUI() {
        loader.style.display = 'none';
        generateBtn.disabled = false;
        generateBtn.textContent = 'Buat Ucapan ✨';
    }

    copyBtn.addEventListener('click', () => { /* ... kode sama seperti sebelumnya ... */ });
    downloadBtn.addEventListener('click', () => { /* ... kode sama seperti sebelumnya ... */ });
});
