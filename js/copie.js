/**
 * SUNU-IDÉES
 * Application SPA CRUD avec classification IA (Ollama)
 */

let idees = JSON.parse(localStorage.getItem("sunuIdees")) || [];

/**
 * Éléments DOM
 */
const formulaireIdee = document.getElementById("formulaire-idee");

const champId = document.getElementById("identifiant-idee");
const champTitre = document.getElementById("titre");
const champDescription = document.getElementById("description");

const boutonEnregistrer = document.getElementById("bouton-enregistrer");
const boutonAnnuler = document.getElementById("bouton-annuler");

const listeIdees = document.getElementById("liste-idees");

const champRecherche = document.getElementById("champ-recherche");
const filtreCategorie = document.getElementById("filtre-categorie");
const selectTri = document.getElementById("tri");

const compteurIdees = document.getElementById("nombre-idees");

// INITIALISATION
document.addEventListener("DOMContentLoaded", () => {
    afficherIdees();
});

// LOCAL STORAGE
function sauvegarderIdees() {
    localStorage.setItem("sunuIdees", JSON.stringify(idees));
}

// NOTIFICATION
function afficherNotification(message) {
    const toastElement = document.getElementById("notification");
    toastElement.querySelector(".toast-body").textContent = message;

    const toast = new bootstrap.Toast(toastElement);
    toast.show();
}

// COMPTEUR
function mettreAJourCompteur() {
    compteurIdees.textContent = idees.length;
}

// DATE
function obtenirDateActuelle() {
    const date = new Date();

    return date.toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "long",
        year: "numeric"
    });
}

//  OLLAMA CLASSIFICATION
/**
 * Classe une idée avec Ollama
 * @param {string} titre
 * @param {string} description
 * @returns {Promise<string>}
 */
/**
 * Classe une idée avec Ollama (version fiable)
 */
async function detectCategorie(titre, description) {

    const prompt = `
Tu es un système de classification STRICT.

Tu dois choisir UNE SEULE catégorie EXACTE parmi :
- pedagogie
- evenement
- campus
- technique

Règles IMPORTANTES :
- Répond UNIQUEMENT avec un mot
- Aucun texte
- Aucun commentaire
- Aucun symbole
- Aucun point

Exemples :
Titre: cours de maths
Description: améliorer les cours
Réponse: pedagogie

Titre: tournoi foot
Description: organiser un match
Réponse: evenement

Maintenant classe ceci :

Titre: ${titre}
Description: ${description}
`;

    const res = await fetch("http://localhost:11434/api/generate", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            model: "llama3",
            prompt,
            stream: false
        })
    });

    const data = await res.json();

    let result = data.response.trim().toLowerCase();

    console.log("RAW IA RESPONSE:", result);

    //  nettoyage intelligent
    if (result.includes("pedagogie")) return "pedagogie";
    if (result.includes("evenement")) return "evenement";
    if (result.includes("campus")) return "campus";
    if (result.includes("technique")) return "technique";

    // fallback sécurisé
    return "technique";
}
// AJOUT / MODIFICATION (AVEC IA)
formulaireIdee.addEventListener("submit", async (event) => {
    event.preventDefault();

    console.log("FORMULAIRE CLIQUÉ");

    const titre = champTitre.value.trim();
    const description = champDescription.value.trim();

    if (!titre || !description) {
        alert("Titre et description obligatoires");
        return;
    }

    let categorieIA = "technique"; 

    try {
        categorieIA = await detectCategorie(titre, description);
        console.log("IA OK :", categorieIA);
    } catch (error) {
        console.error("Erreur IA :", error);
    }

    const nouvelleIdee = {
        id: Date.now(),
        titre,
        description,
        categorie: categorieIA,
        dateCreation: obtenirDateActuelle()
    };

    idees.unshift(nouvelleIdee);

    sauvegarderIdees();
    afficherIdees();

    formulaireIdee.reset();

    afficherNotification("Idée ajoutée");
});

// AFFICHAGE
function afficherIdees() {
    listeIdees.innerHTML = "";

    let resultat = [...idees];

    // RECHERCHE
    const recherche = champRecherche.value.toLowerCase();

    if (recherche) {
        resultat = resultat.filter(idee =>
            idee.titre.toLowerCase().includes(recherche) ||
            idee.description.toLowerCase().includes(recherche)
        );
    }

    // FILTRE
    const categorieChoisie = filtreCategorie.value;

    if (categorieChoisie !== "toutes") {
        resultat = resultat.filter(idee =>
            idee.categorie === categorieChoisie
        );
    }

    // TRI
    const modeTri = selectTri.value;

    switch (modeTri) {
        case "alphabetique":
            resultat.sort((a, b) => a.titre.localeCompare(b.titre));
            break;

        case "ancien":
            resultat.sort((a, b) => a.id - b.id);
            break;

        default:
            resultat.sort((a, b) => b.id - a.id);
    }

    // VIDE
    if (resultat.length === 0) {
        listeIdees.innerHTML = `
        <div class="col-12 text-center p-5">
            <h3>Aucune idée trouvée</h3>
            <p>Ajoutez une nouvelle idée</p>
        </div>`;

        mettreAJourCompteur();
        return;
    }

    resultat.forEach(idee => {
        listeIdees.innerHTML += creerCarteIdee(idee);
    });

    mettreAJourCompteur();
}

// CARTE IDÉE
/**
 * @param {Object} idee
 * @returns {string}
 */
function creerCarteIdee(idee) {

    const nomsCategorie = {
        pedagogie: "Pédagogie",
        evenement: "Événement",
        campus: "Vie de campus",
        technique: "Technique"
    };

    return `
    <div class="col-lg-4 col-md-6">

        <div class="card shadow-sm border-0">

            <div class="card-body">

                <span class="badge bg-primary mb-2">
                    ${nomsCategorie[idee.categorie]}
                </span>

                <h5>${idee.titre}</h5>

                <p>${idee.description}</p>

                <small>${idee.dateCreation}</small>

                <div class="mt-3">

                    <button onclick="modifierIdee(${idee.id})">
                        Modifier
                    </button>

                    <button onclick="supprimerIdee(${idee.id})">
                        Supprimer
                    </button>

                </div>

            </div>

        </div>

    </div>`;
}

// MODIFIER
function modifierIdee(id) {
    const idee = idees.find(i => i.id === id);
    if (!idee) return;

    champId.value = idee.id;
    champTitre.value = idee.titre;
    champDescription.value = idee.description;

    boutonEnregistrer.innerText = "Mettre à jour";
    boutonAnnuler.classList.remove("d-none");
}

// SUPPRIMER
function supprimerIdee(id) {
    if (!confirm("Supprimer cette idée ?")) return;

    idees = idees.filter(i => i.id !== id);

    sauvegarderIdees();
    afficherIdees();

    afficherNotification("Idée supprimée");
}

// RESET FORM
function reinitialiserFormulaire() {
    formulaireIdee.reset();
    champId.value = "";

    boutonEnregistrer.innerText = "Ajouter l'idée";
    boutonAnnuler.classList.add("d-none");
}

// EVENTS UI
champRecherche.addEventListener("input", afficherIdees);
filtreCategorie.addEventListener("change", afficherIdees);
selectTri.addEventListener("change", afficherIdees);

// GLOBAL
window.modifierIdee = modifierIdee;
window.supprimerIdee = supprimerIdee;