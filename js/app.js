import './api.js'
import './state.js'

const nav = document.querySelectorAll('.nav li')
const pages = document.querySelectorAll('.page')

function showSection(id){
  pages.forEach(p=> p.id===id? p.classList.remove('hidden') : p.classList.add('hidden'))
}

nav.forEach(item=>{
  item.addEventListener('click',()=> showSection(item.dataset.target))
})

// initial
showSection('home')
