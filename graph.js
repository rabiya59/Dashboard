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
      graphique(groups);
    })

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

