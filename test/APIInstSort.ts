let apis = [{
  active:0,
  maxActive: 1,
}, {
  active:1,
  maxActive: 1,
}, {
  active:0,
  maxActive: 500,
}, {
  active: 3,
  maxActive: 500,
}]
apis.sort((a, b) => {
  if (a.active >= a.maxActive && b.active >= b.maxActive) {
    return a.active - b.active;
  } else if (a.active >= a.maxActive && b.active < b.maxActive)  {
    return 1
  } else if (a.active < a.maxActive && b.active >= b.maxActive) {
    return -1
  } else {
    return a.active - b.active;
  }
})
console.log(apis)