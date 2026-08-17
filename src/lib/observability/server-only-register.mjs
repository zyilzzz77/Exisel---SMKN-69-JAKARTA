/**
 * Preload shim: mendaftarkan resolve hook yang memetakan paket marker
 * `server-only` ke modul kosong, sehingga modul server murni
 * (rotating-qr, url, dsb.) bisa diimpor oleh test node --test / tsx.
 *
 * Alternatif yang lebih sederhana: jalankan dengan
 *   NODE_OPTIONS="--conditions=react-server" tsx --test <file>
 * karena `server-only` mengekspor "./empty.js" pada kondisi `react-server`.
 */
import { register } from "node:module";

register(new URL("./server-only-loader.mjs", import.meta.url));
