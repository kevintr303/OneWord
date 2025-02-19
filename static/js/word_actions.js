import { getUserVotes, setUserVotes, getLastSubmissionTime, setLastSubmissionTime, darkenColor } from "./helpers.js";

const FIVE_MINUTES = 5 * 60 * 1000;

export function setZoom(zoomValue) {
    const scale = zoomValue / 100;
    const wordGrid = document.getElementById("wordList");
    wordGrid.style.setProperty("--card-scale", scale);
    document.body.classList.toggle("zoomed-out", zoomValue <= 30);
}

export function generateRandomColor() {
    const letters = "0123456789ABCDEF";
    let color = "#";
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

function getRemainingTime(lastTime) {
    const remaining = FIVE_MINUTES - (Date.now() - lastTime);
    return remaining > 0 ? Math.round(remaining / 1000) : 0;
}

export function getSubmissionCooldown() {
    return getRemainingTime(getLastSubmissionTime());
}

export function getVoteCooldown(word) {
    const userVotes = getUserVotes();
    const voteData = userVotes[word];
    return voteData ? getRemainingTime(voteData.lastVoted) : 0;
}

export function canSubmit() {
    return getSubmissionCooldown() === 0;
}

export function canVote(word) {
    return getVoteCooldown(word) === 0;
}

export function recordUserVote(word, direction) {
    const userVotes = getUserVotes();
    userVotes[word] = { lastVoted: Date.now(), direction };
    setUserVotes(userVotes);
}

function animateCardShake(card) {
    card.classList.add("voted-shake");
    setTimeout(() => card.classList.remove("voted-shake"), 600);
}

export function showAlert(message, type = "warning") {
    const alertContainer = document.getElementById("alertContainer");
    const alertId = `alert-${Date.now()}`;
    const alertDiv = document.createElement("div");
    alertDiv.id = alertId;
    alertDiv.className = `alert alert-${type} alert-dismissible fade alert-fade`;
    alertDiv.role = "alert";
    alertDiv.innerHTML = `
    ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
  `;
    alertContainer.appendChild(alertDiv);
    setTimeout(() => alertDiv.classList.add("show"), 10);
    setTimeout(() => new bootstrap.Alert(alertDiv).close(), 4000);
}

export async function voteOnWord(word, change) {
    if (!canVote(word)) {
        showAlert(`You can only vote on "${word}" every 5 minutes. Please wait ${getVoteCooldown(word)} seconds.`, "warning");
        return;
    }
    try {
        const response = await fetch("/vote", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ word, change }),
        });
        const data = await response.json();
        if (data.success) {
            recordUserVote(word, change === 1 ? "up" : "down");
            const card = document.querySelector(`[data-word="${word}"]`);
            if (card) {
                card.querySelector(".vote-score").textContent = data.votes;
                animateCardShake(card);
                card.querySelector(".vote-container").classList.add("vote-disabled");
            }
            animateReorderCards();
        } else {
            showAlert(data.error, "danger");
        }
    } catch (error) {
        console.error("Error voting:", error);
    }
}

export async function submitNewWord(word, color) {
    if (!word) {
        showAlert("Please enter a word!", "danger");
        return;
    }
    let exists;
    try {
        const checkRes = await fetch("/check_word", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ word }),
        });
        exists = (await checkRes.json()).exists;
    } catch (err) {
        console.error("Error checking word existence:", err);
        return;
    }
    if (exists) {
        if (!canVote(word)) {
            showAlert(`You can only vote on "${word}" every 5 minutes. Please wait ${getVoteCooldown(word)} seconds.`, "warning");
            return;
        }
        try {
            const response = await fetch("/vote", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ word, change: 1 }),
            });
            const data = await response.json();
            if (data.success) {
                recordUserVote(word, "up");
                await loadWordCards("", { append: true });
                const card = document.querySelector(`[data-word="${word}"]`);
                if (card) animateCardShake(card);
            } else {
                showAlert(data.error, "danger");
            }
        } catch (error) {
            console.error("Error voting on existing word:", error);
        }
    } else {
        if (!canSubmit()) {
            showAlert(`You can only submit a new word every 5 minutes. Please wait ${getSubmissionCooldown()} seconds.`, "warning");
            return;
        }
        try {
            const response = await fetch("/submit", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ word, color }),
            });
            const data = await response.json();
            if (data.error) {
                showAlert(data.error, "danger");
            } else {
                recordUserVote(data.word, "up");
                setLastSubmissionTime(Date.now());
                await loadWordCards("", { append: true });
                const submitModalEl = document.getElementById("submitModal");
                const submitModal = bootstrap.Modal.getOrCreateInstance(submitModalEl);
                submitModal.hide();
            }
        } catch (error) {
            console.error("Error submitting new word:", error);
        }
    }
}

export function createCardForWord({ word, votes, color, rank }) {
    const card = document.createElement("div");
    card.className = "word-card new-word";
    card.dataset.word = word;
    if (color) {
        const darker = darkenColor(color, 0.3);
        card.style.background = `linear-gradient(135deg, ${darker}, ${color})`;
    }
    const rankBadge = document.createElement("div");
    rankBadge.className = "rank-badge";
    rankBadge.textContent = rank;
    card.appendChild(rankBadge);

    const labelSpan = document.createElement("span");
    labelSpan.textContent = word;
    labelSpan.classList.add("word-label");
    card.appendChild(labelSpan);

    const voteContainer = document.createElement("div");
    voteContainer.className = "vote-container";

    const btnUp = document.createElement("button");
    btnUp.className = "vote-btn vote-up";
    btnUp.textContent = "▲";
    btnUp.addEventListener("click", () => voteOnWord(word, 1));

    const voteScore = document.createElement("div");
    voteScore.className = "vote-score";
    voteScore.textContent = votes;

    const btnDown = document.createElement("button");
    btnDown.className = "vote-btn vote-down";
    btnDown.textContent = "▼";
    btnDown.addEventListener("click", () => voteOnWord(word, -1));

    voteContainer.append(btnUp, voteScore, btnDown);
    card.appendChild(voteContainer);
    return card;
}

export function refreshCardData(card, { votes, rank }) {
    const voteScoreElem = card.querySelector(".vote-score");
    if (parseInt(voteScoreElem.textContent, 10) !== votes) {
        animateCardShake(card);
    }
    voteScoreElem.textContent = votes;
    card.querySelector(".rank-badge").textContent = rank;
}

export function setVoteContainerState(card, word) {
    const voteContainer = card.querySelector(".vote-container");
    voteContainer.classList.toggle("vote-disabled", !canVote(word));
}

export function animateReorderCards() {
    const wordGrid = document.getElementById("wordList");
    const cards = Array.from(wordGrid.children);
    const initialPositions = new Map(cards.map(card => [card, card.getBoundingClientRect()]));

    const sortedCards = cards.sort((a, b) => {
        const votesA = parseInt(a.querySelector(".vote-score").textContent, 10);
        const votesB = parseInt(b.querySelector(".vote-score").textContent, 10);
        const wordA = a.dataset.word.toLowerCase();
        const wordB = b.dataset.word.toLowerCase();
        return votesA === votesB ? wordA.localeCompare(wordB) : votesB - votesA;
    });

    sortedCards.forEach((card, index) => {
        card.querySelector(".rank-badge").textContent = index + 1;
        if (wordGrid.children[index] !== card) {
            wordGrid.insertBefore(card, wordGrid.children[index]);
        }
    });

    sortedCards.forEach(card => {
        const initialRect = initialPositions.get(card);
        const finalRect = card.getBoundingClientRect();
        const deltaY = initialRect.top - finalRect.top;
        if (deltaY !== 0) {
            card.style.transform = `translateY(${deltaY}px)`;
            card.getBoundingClientRect();
            card.style.transition = "transform 0.5s ease-out";
            card.style.transform = "";
            card.addEventListener("transitionend", function cleanup(e) {
                if (e.propertyName === "transform") {
                    card.style.transition = "";
                    card.removeEventListener("transitionend", cleanup);
                }
            });
        }
    });
}

export async function loadWordCards(searchQuery = "", { append = false, offset = 0, limit = 50 } = {}) {
    const wordGrid = document.getElementById("wordList");
    let data;
    try {
        const params = new URLSearchParams({ q: searchQuery, offset, limit });
        const response = await fetch(`/words?${params.toString()}`);
        data = await response.json();
    } catch (error) {
        console.error("Error loading words:", error);
        return { total: 0, loaded: 0 };
    }

    if (!append) wordGrid.innerHTML = "";

    data.words.forEach(wordData => {
        let card = wordGrid.querySelector(`[data-word="${wordData.word}"]`);
        if (card) {
            refreshCardData(card, wordData);
        } else {
            card = createCardForWord(wordData);
            wordGrid.appendChild(card);
            requestAnimationFrame(() => setTimeout(() => card.classList.remove("new-word"), 600));
        }
        setVoteContainerState(card, wordData.word);
    });

    animateReorderCards();
    return { total: data.total, loaded: data.words.length };
}

export async function updateWordCardsDelta({ updates }) {
    const wordGrid = document.getElementById("wordList");
    updates.forEach(({ word, votes, rank, color }) => {
        let card = wordGrid.querySelector(`[data-word="${word}"]`);
        if (card) {
            refreshCardData(card, { votes, rank });
        } else {
            card = createCardForWord({ word, votes, rank, color });
            wordGrid.appendChild(card);
            requestAnimationFrame(() => setTimeout(() => card.classList.remove("new-word"), 600));
        }
        setVoteContainerState(card, word);
    });
    animateReorderCards();
}
