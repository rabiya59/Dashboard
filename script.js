/*****************************
 * DECLARATION DES VARIABLES *
 *****************************/
/*
const urlTeachers = 'http://10.83.1.110:5678/webhook/2122cb53-8f00-48e2-bede-357604460f43';
const urlStudents = 'http://10.83.1.110:5678/webhook/c9ade249-385f-412e-af23-4ff8c52be952';
const urlCourses = 'http://10.83.1.110:5678/webhook/6c6f7bb2-9f1d-4112-b0ea-616f205e1d63';
const urlGroups = 'http://10.83.1.110:5678/webhook/2445d756-1994-4a7f-b527-6c2300823cee';*/

const urlTeachers = "./fichierjson1803/teachers.json";
const urlStudents = "./fichierjson1803/students.json";
const urlCourses = "./fichierjson1803/courses.json";
const urlGroups = "./fichierjson1803/groups.json";

// Tableau qui contiendra les données issues de n8n
let tabTeachers = new Object();
let tabStudents = new Object();
let tabCourses = new Object();
let tabGroups = new Array();
let tabIdParent = new Object();

tabIdParent["stormshield"] = ["1z5nv44lf5fqa9p", "ksq1b1exxh9qa47"];
tabIdParent["ucopia"] = [
  "ats6rk4rlcgq2gj",
  "di996l5j2miq1lu",
  "kst4f0a9g8nq159",
  "n1t60d1b8lyom4",
];
tabIdParent["extreme-networks"] = [
  "c779tj5pw2q3m",
  "f4ikhoq36benyr8",
  "zgheig3ww8bpzlj",
];

// le maximum d'étudiants pour une formation en distanciel
const maxStudentsDist = 6;

 
updateSelectYear();

/******************************
 * MISE A JOUR DU SELECT YEAR *
 ******************************/

function updateSelectYear() {
  let today = new Date();
  let thisYear = today.getFullYear();
  let thisMonth = today.getMonth(); // janvier commence à 0

  let selectYear = document.getElementById("years");
  let opt = document.createElement("option");
  opt.value = 0;
  opt.innerHTML = "Sélectionnez une année";
  selectYear.appendChild(opt);

  let opt2 = document.createElement("option");
  opt2.value = thisYear - 1;
  opt2.innerHTML = thisYear - 1;
  selectYear.appendChild(opt2);

  selectYear.style.textAlign = "center";
  selectYear.style.fontSize = "18px";

  let opt3 = document.createElement("option");
  opt3.value = thisYear;
  // On selectionne l'année par défaut
  opt3.setAttribute("selected", "");

  opt3.innerHTML = thisYear;
  selectYear.appendChild(opt3);

  // on affichera l'annee suivante si elle est dans moins de 6 mois
  if (thisMonth >= 5) {
    let opt4 = document.createElement("option");
    opt4.value = thisYear + 1;
    opt4.innerHTML = thisYear + 1;
    selectYear.appendChild(opt4);
  }
  selectYear.onchange = function () {
    let str = window.location.href;
    str = str.split("#")[1];
    let searchParams = new URLSearchParams(str); // URLSearchParams prend tout ce qu'il y a dans l'adresse après le "?", c'est pour cela qu'on a hoté le "#"

    let paramFormation;
    let paramDisplay;

    if (searchParams.has("formation")) {
      paramFormation = searchParams.get("formation");
    } else {
      paramFormation = "";
    }

    if (searchParams.has("display")) {
      paramDisplay = searchParams.get("display");
    } else {
      paramDisplay = "futures";
    }
   
    displayDashboard(paramFormation, paramDisplay);
  };
}

/****************************
 * RECUPERATION DES DONNEES *
 ****************************/

async function fetchN8n() {
  const [teachersResponse, studentsResponse, coursesResponse, groupsResponse] =
    await Promise.all([
      fetch(urlTeachers),
      fetch(urlStudents),
      fetch(urlCourses),
      fetch(urlGroups),
    ]);
  const teachers = await teachersResponse.json();
  const students = await studentsResponse.json();
  const courses = await coursesResponse.json();
  const groups = await groupsResponse.json();

  return [teachers, students, courses, groups];
}

fetchN8n()
  .then(([teachers, students, courses, groups]) => {
    teachers = teachers.details;
    students = students.details;
    courses = courses.details;
    groups = groups.details;

    teachers.forEach((t) => {
      tabTeachers[t.id] = {
        firstname: t.firstname,
        lastname: t.lastname,
      };
    });

    students.forEach((s) => {
      tabStudents[s.id] = {
        firstname: s.firstname,
        lastname: s.lastname,
        company: s.company,
        tags: s.tags,
        email: s.email,
      };
    });

    courses.forEach((c) => {
      // on prépare le tableau et on l'initialise
      // c.school_group[0] correspond à l'id du webhook groups
      if (!Array.isArray(tabCourses[c.school_group[0]])) {
        tabCourses[c.school_group[0]] = new Array();
        tabCourses[c.school_group[0]].push({
          start: "",
          end: "",
          classroom: "",
          "professeur-id": new Array(),
        });
      }

      // au lieu d'ajouter toutes les dates comme je le faisais avant, mieux vaut juste comparer les dates et garder celle qu'on préfere
      // s'il y a pas de date start ou que start est supérieur à la date parcourru, on l'ajoute (on veut la date start mini)
      if (
        !tabCourses[c.school_group[0]][0]["start"] ||
        tabCourses[c.school_group[0]][0]["start"] > c.start
      ) {
        tabCourses[c.school_group[0]][0]["start"] = c.start;
      }

      // ici on prend la max date end.
      if (
        !tabCourses[c.school_group[0]][0]["end"] ||
        tabCourses[c.school_group[0]][0]["end"] < c.end
      ) {
        tabCourses[c.school_group[0]][0]["end"] = c.end;
      }

      if (
        !tabCourses[c.school_group[0]][0]["professeur-id"].includes(
          c.professeur
        )
      ) {
        tabCourses[c.school_group[0]][0]["professeur-id"].push(c.professeur);
      }

      tabCourses[c.school_group[0]][0]["classroom"] = c.classroom;
    });

    groups.forEach((g) => {
      // S'il y a les informations dans tabCourses pour ce GROUPE ID alors on push,
      // Si non, c'est qu'il n'y a pas de sessions dans Courses
      if (tabCourses[g.id]) {
        let professeurIdentity = "";

        tabCourses[g.id][0]["professeur-id"].forEach((c) => {
          professeurIdentity +=
            tabTeachers[c]["firstname"] + " " + tabTeachers[c]["lastname"];
        });

        tabGroups.push({
          id: g.id,
          name: g.name,
          school_id: g.school_id,
          students: g.students,
          idparent: g.idparent,
          start: tabCourses[g.id][0]["start"],
          end: tabCourses[g.id][0]["end"],
          classroom: tabCourses[g.id][0]["classroom"],
          professeur: professeurIdentity,
        });
      }
    });
  
  
    displayDashboard("toutes", "futures");
    graphique(groups);
  })
  .catch((error) => {
    // /movies or /categories request failed
    console.log("error : ", error);
  });

/************************
 * AFFICHE LE DASHBOARD *
 ************************/

function displayDashboard(formation, expr) {
  switch (expr) {
    case "passees":
    case "toutes":
      tabGroups.sort(function (a, b) {
        return new Date(b.start) - new Date(a.start);
      });
      break; // trie par ordre décroissant pour les formations passées
    default:
      tabGroups.sort(function (a, b) {
        return new Date(a.start) - new Date(b.start);
      });
      break; // trie par ordre croissant pour toutes les autres
  }

  // on met à jour le menu de navigateur entre les formations : passés, encours et futures
  navTemporalite(formation, expr);
  formationThisMonth();
  
  let yearSelect = document.getElementById("years").value;
  let tbody = document.getElementById("tbody-formations");
  tbody.innerHTML = "";

  // on utilise un for pour pouvoir skip le traitement suivant la formation donnée
  for (var i = 0; i < tabGroups.length; i++) {
    let g = tabGroups[i];

    let nbStudents = g.students.length; // on récupère le nombre d'étudiants de la formation parcourue
    let tabStudentsString = ""; // cette variable va nous servir à passer un tableau json dans le input de chaque ligne pour l'utiliser dans le popup

    let skip = false; // va nous permetre de savoir si on va afficher la ligne ou passer à l'étape suivante
    let index = false; // va nous servir à savoir si la formation de lecture appartient bien à la formation passées en argument

    const dateNow = moment().format("YYYY/MM/DD");
    const dateStart = moment(g.start).format("YYYY/MM/DD");
    const dateend = moment(g.end).format("YYYY/MM/DD");
    const dateYearEnd = moment(g.end).format("YYYY");

    /*
    let index = -1; // va nous servir à savoir si la formation de lecture appartient bien à la formation passées en argument
   
    switch (formation) {
      case 'stormshield':      index = g.name.search(/(csne)|(csna)|(stormshield)/i); break;
      case 'ucopia':           index = g.name.search(/(ucopia)/i);                    break;
      case 'extreme-networks': index = g.name.search(/(ecs)/i);                       break;
      default:                 index = 'all';                                         break;  // on aurait pu mettre n'importe quoi d'autre à la place de "all" mais différent des valeurs ci-dessus et -1
    }

    switch (expr) {
      case 'passees': ( (index !== -1 && dateNow > dateend && yearSelect == 0) || ( index !== -1 && dateNow > dateend && dateYearEnd == yearSelect) ) ? skip = false : skip = true; break;
      case 'encours': ( (index !== -1 && dateNow >= dateStart && dateNow <= dateend && yearSelect == 0) || (index !== -1 && dateNow >= dateStart && dateNow <= dateend && dateYearEnd == yearSelect) ) ? skip = false : skip = true; break;
      case 'futures': ( (index !== -1 && dateNow < dateStart && dateNow < dateend && yearSelect == 0) || (index !== -1 && dateNow < dateStart && dateNow < dateend && dateYearEnd == yearSelect) ) ? skip = false : skip = true; break;
      case 'toutes':  ( (index !== -1 && yearSelect == 0) || (index !== -1 && dateYearEnd == yearSelect) ) ? skip = false : skip = true; break;
      default: console.log(`Sorry, we are out of ${expr}.`); skip = true;
    }
    console.log(i);
*/

    switch (formation) {
      case "stormshield":
        index = tabIdParent["stormshield"].includes(g.idparent);
        break;
      case "ucopia":
        index = tabIdParent["ucopia"].includes(g.idparent);
        break;
      case "extreme-networks":
        index = tabIdParent["extreme-networks"].includes(g.idparent);
        break;
      case "toutes":
        index = true;
        break;
      default:
        index = false;
        break;
    }

    switch (expr) {
      case "passees":
        (index && dateNow > dateend && yearSelect == 0) ||
        (index && dateNow > dateend && dateYearEnd == yearSelect)
          ? (skip = false)
          : (skip = true);
        break;
      case "encours":
        (index &&
          dateNow >= dateStart &&
          dateNow <= dateend &&
          yearSelect == 0) ||
        (index &&
          dateNow >= dateStart &&
          dateNow <= dateend &&
          dateYearEnd == yearSelect)
          ? (skip = false)
          : (skip = true);
        break;
      case "futures":
        (index &&
          dateNow < dateStart &&
          dateNow < dateend &&
          yearSelect == 0) ||
        (index &&
          dateNow < dateStart &&
          dateNow < dateend &&
          dateYearEnd == yearSelect)
          ? (skip = false)
          : (skip = true);
        break;
      case "toutes":
        (index && yearSelect == 0) || (index && dateYearEnd == yearSelect)
          ? (skip = false)
          : (skip = true);
        break;
      default:
        console.log(`Sorry, we are out of ${expr}.`);
        skip = true;
    }

    if (skip) {
      continue;
    }

    // S'il y a au moins un étudiant, on affiche ses informations
    if (nbStudents > 0) {
      // on parcourt le tableau d'id étudiants, les informations de l'étudiant "id" sont disponible dans tabStudents[id]
      g.students.forEach((id) => {
        tabStudentsString +=
          '{ "lastname":"' +
          tabStudents[id].lastname +
          '",' +
          '"firstname":"' +
          tabStudents[id].firstname +
          '",' +
          '"company":"' +
          tabStudents[id].company +
          '",' +
          '"tags":"' +
          tabStudents[id].tags +
          '",' +
          '"email":"' +
          tabStudents[id].email +
          '"' +
          "},";
      });
      tabStudentsString =
        "[" +
        tabStudentsString.substring(0, tabStudentsString.length - 1) +
        "]";
    }

    let openPopup = document.createElement("button");
    openPopup.className = "fa-solid fa-eye";
    openPopup.onclick = function () {
      displayPopup(tabStudentsString);
    };

    let colDetail = document.createElement("td");
    colDetail.className = "td-detail";
    colDetail.appendChild(openPopup);

    let colNbStudents = document.createElement("td");
    colNbStudents.style = "text-align: center";
    colNbStudents.innerHTML = g.students.length;

    let colLieu = document.createElement("td");
    colLieu.innerHTML = g.classroom;
    colLieu.style = "text-align: center";

    let colProf = document.createElement("td");
    colProf.innerHTML = g.professeur;

    let colName = document.createElement("td");
    colName.innerHTML = g.name;

    let colAlert = document.createElement("td");
    if (nbStudents === 0) {
      colAlert.innerHTML = "⚠ Aucun inscrit";
    } else if (nbStudents >= maxStudentsDist && g.classroom === "Distanciel") {
      colAlert.innerHTML = "⚠ complet";
    } else {
      colAlert.innerHTML = "";
    }
    if (nbStudents >= 8) {
      colAlert.innerHTML = "⚠ complet";
    }
    colAlert.style.color = "#FF0000";

    let lig = document.createElement("tr");
    lig.appendChild(colName);
    lig.appendChild(colProf);
    lig.appendChild(colLieu);
    lig.appendChild(colAlert);
    lig.appendChild(colNbStudents);
    lig.appendChild(colDetail);

    tbody.appendChild(lig);
  }

  // Ajouter jquery pour le loader
  $("#wait").addClass("hide-loader");
  $("#loader").addClass("hide-loader");

  var dateGlobale = new Date();

  var annee = dateGlobale.getFullYear();
  var mois = dateGlobale.getMonth();
  var jour = dateGlobale.getDate();
  var jour_semaine = dateGlobale.getDay();

  var heure = dateGlobale.getHours();
  var minute = dateGlobale.getMinutes();
  var seconde = dateGlobale.getSeconds();

  if (heure < 10) {
    heure = "0" + heure;
  }
  if (minute < 10) {
    minute = "0" + minute;
  }
  if (seconde < 10) {
    seconde = "0" + seconde;
  }

  var MOIS = [
    "janvier",
    "février",
    "mars",
    "avril",
    "mai",
    "juin",
    "Juillet",
    "Aout",
    "septembre",
    "octobre",
    "novembre",
    "décembre",
  ];
  var JOUR_SEMAINE = [
    "dimanche",
    "lundi",
    "mardi",
    "mercredi",
    "jeudi",
    "vendredi",
    "samedi",
  ];

  mois = MOIS[mois];
  jour_semaine = JOUR_SEMAINE[jour_semaine];

  document.getElementById("heure_exacte").innerHTML =
    jour_semaine +
    " " +
    jour +
    " " +
    mois +
    " " +
    annee +
    " - " +
    heure +
    ":" +
    minute +
    ":" +
    seconde;
}

/***********************************************************************
 * ACTUALISE LE MENU DE NAVIGATION (passees, encours, futures, toutes) *
 ***********************************************************************/

function navTemporalite(paramUrlFormation, paramUrlDisplay) {
  // on met à jour la balise h3 pour indiquer qu'on affiche bien des données de stormshield ou ucopia ou extreme networks
  let htrois = document.getElementsByTagName("h3")[0];
  htrois.innerHTML =
    " " +
    (paramUrlFormation !== "#" && paramUrlFormation !== ""
      ? paramUrlFormation.charAt(0).toUpperCase() + paramUrlFormation.slice(1)
      : "Toutes les formations");

  let spanForm = document.createElement("span");
  spanForm.innerHTML = "";

  let spanEspacement = document.createElement("span");
  spanEspacement.innerHTML = " | ";

  let aPassees = document.createElement("a");
  aPassees.text = "passées";
  aPassees.href =
    paramUrlFormation !== ""
      ? "#formation=" + paramUrlFormation + "&display=passees"
      : "#";
  aPassees.onclick = function () {
    displayDashboard(paramUrlFormation, "passees");
  };
  if (paramUrlDisplay == "passees") {
    aPassees.style = "background-color: #456456";
    //aPassees.style = 'a:active { background-color: #456456 }';
  }

  let aEnCours = document.createElement("a");
  aEnCours.text = "en cours";
  aEnCours.href =
    paramUrlFormation !== ""
      ? "#formation=" + paramUrlFormation + "&display=encours"
      : "#";
  aEnCours.onclick = function () {
    displayDashboard(paramUrlFormation, "encours");
  };
  if (paramUrlDisplay == "encours") {
    aEnCours.style = "background-color: #456456";
    //aEnCours.style = 'a:active { background-color: #456456 }';
  }

  let aFutures = document.createElement("a");
  aFutures.text = "futures";
  aFutures.href =
    paramUrlFormation !== ""
      ? "#formation=" + paramUrlFormation + "&display=futures"
      : "#";
  aFutures.onclick = function () {
    displayDashboard(paramUrlFormation, "futures");
  };
  if (paramUrlDisplay == "futures") {
    aFutures.style = "background-color: #456456";

    //aFutures.style = 'a:active { background-color: #456456 }';
  }

  let aToutes = document.createElement("a");
  aToutes.text = "toutes";
  aToutes.href =
    paramUrlFormation !== ""
      ? "#formation=" + paramUrlFormation + "&display=toutes"
      : "#";
  aToutes.onclick = function () {
    displayDashboard(paramUrlFormation, "toutes");
  };
  if (paramUrlDisplay == "toutes") {
    aToutes.style = "background-color: #456456";
    //aToutes.style = 'a:active { background-color: #456456 }';
  }

  let navT = document.getElementById("nav-temporalite");
  navT.innerHTML = "";

  navT.appendChild(spanForm);
  navT.appendChild(aPassees);
  navT.appendChild(spanEspacement);
  navT.appendChild(aEnCours);
  navT.appendChild(spanEspacement.cloneNode(true));
  navT.appendChild(aFutures);
  navT.appendChild(spanEspacement.cloneNode(true));
  navT.appendChild(aToutes);
}

/************************************************************
 * AFFICHE UN POPUP AVEC LES INFORMATIONS SUR DES ÉTUDIANTS *
 ************************************************************/

function displayPopup(data) {
  if (data) {
    // si data n'est pas vide
    let content = "";

    let modal = document.getElementById("myModal");
    let contentModal = document.getElementById("modal-body");
    let span = document.getElementsByClassName("close")[0];

    content +=
      '<table class="table"><thead><tr><th>Nom</th><th>Prénom</th><th>Companie</th><th>Tags</th><th class="copy">Email</th></tr></thead><tbody>';

    /* Analyser les données, puis parcourir les données et les ajouter à la variable de contenu. */
    JSON.parse(data).forEach((id) => {
      let mail = tabStudents.email;
      console.log(mail);
      content += "<tr>";
      content += "<td>" + id.lastname + "</td>";
      content += "<td>" + id.firstname + "</td>";
      content += "<td>" + id.company + "</td>";
      content += "<td>" + id.tags + "</td>";
      content += "<td>" + id.email + "</td>";
      content += "</tr>";
    });

    /*const btnCopy = document.createElement('btn-copy');


    const txtCopy =document.querySelector ('.copy');

    btnCopy.addEventListener('click', () => {
      navigator.clipboard.writeText();
    })*/

    content += "</tbody></table>";

    contentModal.innerHTML = content;
    modal.style.display = "block";

    span.onclick = function () {
      modal.style.display = "none";
    };

    window.onclick = function (event) {
      if (event.target == modal) {
        modal.style.display = "none";
      }
    };
  }
}

/*************************************************************
 * AFFICHE LE NOMBRE DE FORMATIONS EN COURS DU MOIS EN COURS *
 *************************************************************/

function formationThisMonth() {
  let nbFormations = document.getElementById("nb-formations");
  let stringOutput = "";

  let nbSto = 0;
  let nbStoVide = 0;
  let nbUco = 0;
  let nbUcoVide = 0;
  let nbExt = 0;
  let nbExtVide = 0;

  tabGroups.forEach((g) => {
    const monthNow = moment().format("MM");
    const monthStart = moment(g.start).format("MM");
    const monthEnd = moment(g.end).format("MM");

    if (
      (monthNow >= monthStart && monthNow < monthEnd) ||
      (monthNow >= monthStart && monthNow == monthEnd)
    ) {
      if (tabIdParent["stormshield"].includes(g.idparent)) {
        nbSto++;
        if (g.students.length == 0) {
          nbStoVide++;
        }
      }
      if (tabIdParent["ucopia"].includes(g.idparent)) {
        nbUco++;
        if (g.students.length == 0) {
          nbUcoVide++;
        }
      }
      if (tabIdParent["extreme-networks"].includes(g.idparent)) {
        nbExt++;
        if (g.students.length == 0) {
          nbExtVide++;
        }
      }
    }
  });

  // on cree l'affichage
  if (nbSto > 0) {
    //stringOutput += nbSto + ' stormshield (' +  nbStoVide + ' vide)';
    stringOutput += nbSto + " stormshield " + "<br/>";
  }
  if (nbUco > 0) {
    // stringOutput += nbUco + ' ucopia (' +  nbUcoVide + ' vide)<br/>';
    stringOutput += nbUco + " ucopia " + "<br/>";
  }
  if (nbExt > 0) {
    //  stringOutput += nbExt + ' extreme-networks (' +  nbExtVide + ' vide)<br/>';
    stringOutput += nbExt + " extreme-networks " + "<br/>";
  }

  nbFormations.innerHTML = stringOutput;
}

// Ajout du hover
let list = document.querySelectorAll(".navigation li");

function activeLink() {
  list.forEach((item) => item.classList.remove("hovered"));
  this.classList.add("hovered");
}

list.forEach((item) => item.addEventListener("mouseover", activeLink));

//Menu toggle

let toggle = document.querySelector(".toggle");
let navigation = document.querySelector(".navigation");
let main = document.querySelector(".main");

toggle.onclick = function () {
  navigation.classList.toggle("active");
  main.classList.toggle("active");
};

//Affichage heure

function reload() {
  location.reload();
}
document.querySelector("#upload").addEventListener("click", reload);


// hover
$(document).on("click", "ul li", function () {
  $(this).addClass("active").siblings().removeClass("active");
});


// Charts Js: Graphiques
function graphique(groups) {

  let nbStormshield = 0;
  let nbUcopia = 0;
  let nbExtNet = 0;
  
  groups.forEach(g => {
    if (tabIdParent["stormshield"].includes(g.idparent) ) {
      nbStormshield++;
    }
    if (tabIdParent["ucopia"].includes(g.idparent) ) {
      nbUcopia++;
    }
    if (tabIdParent["extreme-networks"].includes(g.idparent) ) {
      nbExtNet++;
    }
 
  });
  
  const ctx = document.getElementById('myChart');
  
  const myChart = new Chart(ctx, {
      type: 'pie',
      data: {
          labels: ['Sormshield', 'Ucopia', 'extreme-networks'],
          datasets: [{
              label: '# of Votes',
              data: [nbStormshield, nbUcopia, nbExtNet],
              backgroundColor: [
                  'rgba(255, 99, 132, 0.2)',
                  'rgba(54, 162, 235, 0.2)',
                  'rgba(255, 206, 86, 0.2)'  
              ],
              borderColor: [
                  'rgba(255, 99, 132, 1)',
                  'rgba(54, 162, 235, 1)',
                  'rgba(255, 206, 86, 1)'
              ],
              borderWidth: 1
          }]
      },
      options: {
          scales: {
              y: {
                  beginAtZero: true
              }
          }
      }
  });console.log(myChart)

  
}
/*$(document).ready(function(){
  $('li').on('click', function(){
  $(this).siblings().removeClass('active');
  $(this).siblings().addClass('active');

  })
}
)*/






