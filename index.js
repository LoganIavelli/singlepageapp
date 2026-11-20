/* AI Disclosure: AI was used to help summarize and understand the documentation and aid in helping implement it into the code where I ran into issues.*/

const API_ROOT = "https://mcp.10ml.com";
const form = document.querySelector("#idea-form");
const categoryInput = document.querySelector("#category");
const ideaInput = document.querySelector("#idea");
const tank = document.querySelector("#tank");
const bowlIdeas = document.querySelector("#bowl-ideas");
const submitButton = document.querySelector("#submit-tank");
const results = document.querySelector("#results");
const ideas = [];

form.addEventListener("submit", event => {
    event.preventDefault();

    const text = ideaInput.value.trim();
    if (!text) return;

    ideas.push({
        category: categoryInput.value,
        text
    });

    renderTank();
    ideaInput.value = "";
    ideaInput.focus();
});

tank.addEventListener("click", event => {
    const removeButton = event.target.closest("[data-remove]");
    if (!removeButton) return;

    ideas.splice(Number(removeButton.dataset.remove), 1);
    renderTank();
});

submitButton.addEventListener("click", findMatches);

function renderTank() {
    if (!ideas.length) {
        tank.innerHTML = "<li>The tank is empty.</li>";
        bowlIdeas.innerHTML = "";
        return;
    }

    tank.innerHTML = ideas.map((idea, index) => `
        <li class="idea-item">
            ${escapeHtml(idea.category)}: ${escapeHtml(idea.text)}
            <button type="button" data-remove="${index}">Remove</button>
        </li>
    `).join("");

    bowlIdeas.innerHTML = ideas.map((idea, index) => `
        <span class="bowl-word bowl-word-${(index % 6) + 1}">
            ${escapeHtml(idea.text)}
        </span>
    `).join("");
}

async function findMatches() {
    if (!ideas.length) {
        results.innerHTML = "<li>Add ideas to the tank first.</li>";
        return;
    }

    const query = ideas.map(idea => idea.text).join(" ");
    const params = new URLSearchParams({
        q: query,
        limit: "20",
        format: "detailed"
    });

    submitButton.disabled = true;
    submitButton.textContent = "Searching...";
    results.textContent = "Searching...";

    try {
        const response = await fetch(`${API_ROOT}/api/v1/perfumes?${params}`);
        if (!response.ok) throw new Error(`API returned ${response.status}`);

        const data = await response.json();
        const ranked = (data.results || [])
            .map(perfume => ({
                perfume,
                score: getMatchScore(perfume)
            }))
            .sort((a, b) => b.score - a.score)
            .slice(0, 3);

        if (!ranked.length) {
            results.innerHTML = "<li>No fragrances found.</li>";
            return;
        }

        results.innerHTML = ranked.map(({ perfume, score }) => {
            const link = perfume.links?.find(item => item.type === "try")?.url
                || `https://10ml.com/search?q=${encodeURIComponent(`${perfume.house} ${perfume.name}`)}`;

            return `
                <li>
                    <strong>${escapeHtml(perfume.name)}</strong> - ${escapeHtml(perfume.house)}
                    (${score} of ${ideas.length} ideas matched)
                    <br>${escapeHtml(perfume.character || "")}
                    <br><a href="${escapeHtml(link)}" target="_blank" rel="noreferrer">View fragrance</a>
                </li>
            `;
        }).join("");
    } catch (error) {
        results.innerHTML = `<li>Could not search: ${escapeHtml(error.message)}</li>`;
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = "Find my top 3 fragrances";
    }
}

/* AI Disclosure: AI was used to partially author and implement this portion of the code.*/
function getMatchScore(perfume) {
    const pyramid = perfume.pyramid || {};
    const searchableText = [
        perfume.name,
        perfume.house,
        perfume.family,
        perfume.character,
        ...(perfume.seasons || []),
        ...(perfume.styles || []),
        ...(perfume.accords || []),
        ...(perfume.key_notes || []),
        ...(pyramid.top || []),
        ...(pyramid.heart || []),
        ...(pyramid.base || [])
    ].join(" ").toLowerCase();

    let score = 0;

    for (const idea of ideas) {
        const value = idea.text.toLowerCase().trim();
        if (!value) continue;

        if (idea.category === "season") {
            const seasons = (perfume.seasons || []).join(" ").toLowerCase();
            if (seasons.includes(value) || searchableText.includes(value)) score++;
        } else if (idea.category === "style") {
            const styles = [
                ...(perfume.styles || []),
                ...(perfume.accords || [])
            ].join(" ").toLowerCase();
            if (styles.includes(value) || searchableText.includes(value)) score++;
        } else if (idea.category === "notes") {
            const notes = [
                ...(perfume.key_notes || []),
                ...(pyramid.top || []),
                ...(pyramid.heart || []),
                ...(pyramid.base || [])
            ].join(" ").toLowerCase();
            if (notes.includes(value) || searchableText.includes(value)) score++;
        }
    }

    return score;
}

/* AI Disclosure: AI was used to help with implementing this into the code. This function is important for working with the API and for security purposes. */
function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

renderTank();
