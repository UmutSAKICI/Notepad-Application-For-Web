document.querySelector('.open-tag').addEventListener('click', function () {
  document.querySelector('.open-tag').style.display = 'none';
  document.querySelector('.close-tag').style.cssText = 'display: flex !important';
  document.querySelector('.close-tag').style.display = 'z-index: 999';
  document.querySelector('.main-notes-db').style.cssText = 'display: flex !important;';
});

document.querySelector('.close-tag').addEventListener('click', function () {
  document.querySelector('.open-tag').style.display = 'block';
  document.querySelector('.close-tag').style.display = 'none';
  document.querySelector('.close-tag').style.display = 'z-index: 999';
  document.querySelector('.main-notes-db').style.cssText = 'display: flex;';
});