import { debounce } from "./helpers.js";
import { loadWordCards, submitNewWord, generateRandomColor, updateWordCardsDelta, setZoom } from "./word_actions.js";

document.addEventListener("DOMContentLoaded", () => {
    const searchInput = document.getElementById("searchInput");
    const submitBtn = document.getElementById("submitBtn");
    const wordInput = document.getElementById("wordInput");
    const randomColorBtn = document.getElementById("randomColorBtn");
    const colorPicker = document.getElementById("colorPicker");
    const submitModalEl = document.getElementById("submitModal");
    const zoomInBtn = document.getElementById("zoomInBtn");
    const zoomOutBtn = document.getElementById("zoomOutBtn");
    const zoomValueSpan = document.getElementById("zoomValue");
    const wordGrid = document.getElementById("wordList");

    const allowedMin = 30;
    const allowedMax = 150;
    const baseCardWidth = 200;
    const baseGap = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    const epsilon = 0.01;

    function calculateDiscreteScales() {
        const availableWidth = wordGrid.clientWidth - 2 * baseGap;
        let scales = [];
        for (let n = 1; n <= 20; n++) {
            let scale = availableWidth / (n * baseCardWidth + (n - 1) * baseGap);
            scale -= epsilon;
            const zoomPercent = Math.round(scale * 100);
            if (zoomPercent >= allowedMin && zoomPercent <= allowedMax) scales.push(zoomPercent);
        }
        if (!scales.includes(allowedMin)) scales.push(allowedMin);
        if (!scales.includes(allowedMax)) scales.push(allowedMax);
        return Array.from(new Set(scales)).sort((a, b) => a - b);
    }

    function findClosestIndex(currentZoom, zoomArray) {
        let closestIndex = 0;
        let minDiff = Infinity;
        zoomArray.forEach((z, i) => {
            const diff = Math.abs(z - currentZoom);
            if (diff < minDiff) {
                minDiff = diff;
                closestIndex = i;
            }
        });
        return closestIndex;
    }

    function calculateInitialZoom() {
        const availableWidth = wordGrid.clientWidth - 2 * baseGap;
        const columns = Math.floor((availableWidth + baseGap) / (baseCardWidth + baseGap));
        let scale = availableWidth / (columns * baseCardWidth + (columns - 1) * baseGap);
        scale -= epsilon;
        return Math.round(scale * 100);
    }

    function recalculateZoomPoints() {
        const discreteScales = calculateDiscreteScales();
        const idealZoom = calculateInitialZoom();
        currentZoom = currentZoom || idealZoom;
        currentIndex = findClosestIndex(currentZoom, discreteScales);
        return discreteScales;
    }

    // Initial load and socket setup
    loadWordCards("", true);
    const socket = io();
    socket.on("batch_update", (data) => updateWordCardsDelta(data));

    let currentOffset = 0;
    const limit = 50;
    let totalWords = Infinity;
    let isLoading = false;

    async function loadAdditionalWords() {
        if (isLoading || currentOffset >= totalWords) return;
        isLoading = true;
        const result = await loadWordCards(searchInput.value.trim(), {
            append: currentOffset > 0,
            offset: currentOffset,
            limit,
        });
        currentOffset += result.loaded;
        totalWords = result.total;
        isLoading = false;
        checkIfMoreWordsNeeded();
    }

    function checkIfMoreWordsNeeded() {
        if (document.body.offsetHeight <= window.innerHeight && currentOffset < totalWords) {
            loadAdditionalWords();
        }
    }

    loadAdditionalWords();

    window.addEventListener("scroll", debounce(() => {
        if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 200) {
            loadAdditionalWords();
        }
    }, 200));

    window.addEventListener("resize", debounce(() => {
        checkIfMoreWordsNeeded();
    }, 200));

    searchInput.addEventListener("input", debounce((event) => {
        loadWordCards(event.target.value.trim(), true);
    }, 300));

    let currentZoom = calculateInitialZoom();
    let currentIndex = 0;
    let discreteScales = recalculateZoomPoints();
    currentIndex = findClosestIndex(currentZoom, discreteScales);
    currentZoom = discreteScales[currentIndex];
    zoomValueSpan.textContent = currentZoom + "%";
    setZoom(currentZoom);

    zoomInBtn.addEventListener("click", () => {
        discreteScales = recalculateZoomPoints();
        if (currentIndex < discreteScales.length - 1) {
            currentIndex++;
            currentZoom = discreteScales[currentIndex];
            zoomValueSpan.textContent = currentZoom + "%";
            setZoom(currentZoom);
            checkIfMoreWordsNeeded();
        }
    });

    zoomOutBtn.addEventListener("click", () => {
        discreteScales = recalculateZoomPoints();
        if (currentIndex > 0) {
            currentIndex--;
            currentZoom = discreteScales[currentIndex];
            zoomValueSpan.textContent = currentZoom + "%";
            setZoom(currentZoom);
            checkIfMoreWordsNeeded();
        }
    });

    window.addEventListener("resize", debounce(() => {
        discreteScales = recalculateZoomPoints();
        currentIndex = findClosestIndex(currentZoom, discreteScales);
        currentZoom = discreteScales[currentIndex];
        zoomValueSpan.textContent = currentZoom + "%";
        setZoom(currentZoom);
    }, 200));

    submitBtn.addEventListener("click", () => {
        submitNewWord(wordInput.value.trim(), colorPicker.value);
    });
    wordInput.addEventListener("keyup", (event) => {
        if (event.key === "Enter") {
            submitNewWord(wordInput.value.trim(), colorPicker.value);
        }
    });

    randomColorBtn.addEventListener("click", () => {
        colorPicker.value = generateRandomColor();
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "/" && document.activeElement !== searchInput) {
            event.preventDefault();
            searchInput.focus();
        }
    });

    submitModalEl.addEventListener("hidden.bs.modal", () => {
        document.body.focus();
    });
});
