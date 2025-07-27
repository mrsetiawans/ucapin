// script.js
import { GoogleGenerativeAI } from "https://esm.run/@google/generative-ai";

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const apiKeyInput = document.getElementById('apiKey');
    const saveApiKeyBtn = document.getElementById('saveApiKeyBtn');
    const apiKeyStatus = document.getElementById('apiKeyStatus');
    const apiKeyLoader = document.getElementById('apiKeyLoader');
    const mainFieldset = document.getElementById('main-fieldset');
    
    const form = document.getElementById('ucapan-form');
    const generateBtn = document.getElementById('generate-btn');
    const generateLoader = document.getElementById('generateLoader');
    
    const previewFrame = document.getElementById('preview-frame');
    const previewPlaceholder = document.getElementById('preview-placeholder');
    const resultActions = document.querySelector('.result-actions');
    const copyBtn = document.getElementById('copy-btn');
    const downloadBtn = document.getElementById('download-btn');
    const copyFeedback = document.getElementById('copy-feedback');

    let generatedHtml = '';
    const storedApiKey = localStorage.getItem('geminiApiKey');

    // --- FUNGSI UTAMA ---

    // 1. Inisialisasi halaman saat dimuat
    function initialize() {
        if (storedApiKey) {
            apiKeyInput.value = storedApiKey;
            validateAndSaveApiKey(false); // Validasi tanpa menampilkan alert sukses
        }
        document.getElementById('date').value = new Date().toISOString().split('T')[0];
        
        saveApiKeyBtn.addEventListener('click', () => validateAndSaveApiKey(true));
        form.addEventListener('submit', handleFormSubmit);
        copyBtn.addEventListener('click', copyHtml);
        downloadBtn.addEventListener('click', downloadHtml);
    }

    // 2. Fungsi untuk validasi dan menyimpan API Key
    async function validateAndSaveApiKey(showAlert) {
        const apiKey = apiKeyInput.value.trim();
        if (!apiKey) {
            alert('Harap masukkan API Key.');
            return;
        }

        apiKeyLoader.style.display = 'block';
        saveApiKeyBtn.disabled = true;
        setApiKeyStatus('');

        try {
            const genAI = new GoogleGenerativeAI(apiKey);
            // Coba panggil model untuk validasi
            await genAI.getGenerativeModel({ model: "gemini-pro" }).generateContent("hello");
            
            // Jika berhasil
            localStorage.setItem('geminiApiKey', apiKey);
            setApiKeyStatus('valid');
            mainFieldset.disabled = false;
            previewPlaceholder.innerHTML = "<p>API Key valid. Silakan isi form untuk membuat ucapan.</p>";
            if (showAlert) {
                alert('API Key valid dan berhasil disimpan!');
            }

        } catch (error) {
            // Jika gagal
            console.error("API Key Validation Error:", error);
            localStorage.removeItem('geminiApiKey');
            setApiKeyStatus('invalid');
            mainFieldset.disabled = true;
            previewPlaceholder.innerHTML = "<p>API Key tidak valid. Harap periksa kembali dan simpan ulang.</p>";
            if (showAlert) {
                alert('API Key tidak valid. Silakan periksa kembali.');
            }
        } finally {
            apiKeyLoader.style.display = 'none';
            saveApiKeyBtn.disabled = false;
        }
    }

    // 3. Fungsi untuk menangani submit form utama
    async function handleFormSubmit(e) {
        e.preventDefault();

        generateLoader.style.display = 'block';
        generateBtn.disabled = true;
        generateBtn.textContent = 'Membuat...';
        resultActions.style.display = 'none';

        const apiKey = localStorage.getItem('geminiApiKey');
        if (!apiKey) {
            alert('API Key tidak ditemukan. Harap validasi terlebih dahulu.');
            resetGenerateUI();
            return;
        }

        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        const { name, sender, date, theme, vibe } = data;

        try {
            // Ambil template
            const themeFileName = theme === 'ghibli_malam' ? 'Ghibli Malam.html' : `${theme.charAt(0).toUpperCase() + theme.slice(1)}.html`;
            const templateResponse = await fetch(`themes/${themeFileName}`);
            if (!templateResponse.ok) throw new Error(`Tidak bisa memuat template: ${themeFileName}`);
            let templateHtml = await templateResponse.text();

            // Panggil AI
            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({ model: "gemini-pro" });
            const prompt = createPrompt(name, sender, theme, vibe);
            const result = await model.generateContent(prompt);
            const responseText = await result.response.text();
            const cleanJsonString = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
            const aiData = JSON.parse(cleanJsonString);

            // Ganti placeholder
            generatedHtml = populateTemplate(templateHtml, { ...data, ...aiData });
            
            // Tampilkan hasil
            previewPlaceholder.style.display = 'none';
            previewFrame.srcdoc = generatedHtml;
            previewFrame.style.display = 'block';
            resultActions.style.display = 'flex';

        } catch (error) {
            console.error("Generate Error:", error);
            alert('Terjadi kesalahan saat membuat ucapan. Detail: ' + error.message);
        } finally {
            resetGenerateUI();
        }
    }
    
    // --- FUNGSI PEMBANTU ---
    function setApiKeyStatus(status) {
        apiKeyStatus.className = `api-status ${status}`;
        if (status === 'valid') apiKeyStatus.textContent = '✔️';
        else if (status === 'invalid') apiKeyStatus.textContent = '❌';
        else apiKeyStatus.textContent = '';
    }
    
    function resetGenerateUI() {
        generateLoader.style.display = 'none';
        generateBtn.disabled = false;
        generateBtn.textContent = 'Buat Ucapan ✨';
    }

    function createPrompt(name, sender, theme, vibe) {
        return `Buatlah konten untuk ucapan ulang tahun dengan tema "${theme}" dan nuansa "${vibe}" untuk seseorang bernama "${name}" dari "${sender}".
                Tolong berikan output dalam format JSON yang ketat, tanpa markdown atau teks tambahan di luar JSON.
                Struktur JSON harus seperti ini:
                {
                  "title": "Judul utama yang sangat puitis dan sesuai tema, sekitar 3-5 kata",
                  "subtitle": "Sub-judul yang menyebutkan nama penerima dan deskripsi singkat sesuai tema",
                  "message1": "Paragraf pertama ucapan selamat ulang tahun yang hangat dan sesuai tema.",
                  "message2": "Paragraf kedua berisi harapan, doa, atau kata-kata penyemangat yang sesuai tema.",
                  "message3": "Paragraf ketiga berisi penutup yang hangat dan personal dari pengirim.",
                  "specialWish": "Sebuah doa atau harapan panjang yang sangat mendalam dan puitis, lebih rinci dari pesan sebelumnya. Gunakan tag HTML <br><br> untuk membuat paragraf baru dalam teks ini."
                }`;
    }

    function populateTemplate(template, data) {
        const [year, month, day] = data.date.split('-');
        return template
            .replaceAll('{{NAME}}', data.name)
            .replaceAll('{{SENDER}}', data.sender)
            .replaceAll('{{TITLE}}', data.title)
            .replaceAll('{{SUBTITLE}}', data.subtitle)
            .replaceAll('{{MESSAGE_1}}', data.message1)
            .replaceAll('{{MESSAGE_2}}', data.message2)
            .replaceAll('{{MESSAGE_3}}', data.message3)
            .replaceAll('{{SPECIAL_WISH}}', data.specialWish)
            .replaceAll('{{YEAR}}', year)
            .replaceAll('{{MONTH}}', month)
            .replaceAll('{{DAY}}', day);
    }
    
    function copyHtml() {
        if (!generatedHtml) return;
        navigator.clipboard.writeText(generatedHtml).then(() => {
            copyFeedback.textContent = 'Kode HTML berhasil disalin!';
            copyFeedback.style.opacity = 1;
            setTimeout(() => { copyFeedback.style.opacity = 0; }, 2000);
        }).catch(err => alert('Gagal menyalin kode: ' + err));
    }

    function downloadHtml() {
        if (!generatedHtml) return;
        const blob = new Blob([generatedHtml], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const theme = document.getElementById('theme').value;
        const name = document.getElementById('name').value.replace(/\s+/g, '_') || 'ucapan';
        a.href = url;
        a.download = `ucapan_untuk_${name}_tema_${theme}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // Jalankan inisialisasi
    initialize();
});
