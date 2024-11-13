document.addEventListener('DOMContentLoaded', function () {

  // CREATE Note Popup
  const newpopup = document.getElementById('new-popup');
  const newOpenPopup = document.getElementById('newNote')
  const closeNewPopup = document.getElementById('closeNewPopup');

  newOpenPopup.addEventListener('click', function () {
    newpopup.style.display = 'flex';
  })

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' || event.key === 'Esc') {
      newpopup.style.display = 'none';
    }
  });

  closeNewPopup.addEventListener('click', function () {
    newpopup.style.display = 'none';
  })

  // DELETE Note Popup
  const delpopup = document.getElementById('del-popup');
  const delOpenPopup = document.getElementById('delNote');
  const closeDelPopup = document.getElementById('closeDelPopup');

  delOpenPopup.addEventListener('click', function () {
    delpopup.style.display = 'flex';
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' || event.key === 'Esc') {
      delpopup.style.display = 'none';
    }
  });

  closeDelPopup.addEventListener('click', function () {
    delpopup.style.display = 'none';
  })

  // EDIT Note Popup

  const editpopup = document.getElementById('edit-popup');
  const editOpenPopup = document.getElementById('editNote');
  const closeEditPopup = document.getElementById('closeEditPopup');

  editOpenPopup.addEventListener('click', function () {
    editpopup.style.display = 'flex';
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' || event.key === 'Esc') {
      editpopup.style.display = 'none';
    }
  });

  closeEditPopup.addEventListener('click', function () {
    editpopup.style.display = 'none';
  })


})

// Length for Characters

document.getElementById('name-input').addEventListener('input', function () {
  const length = this.value.length;
  const maxLengthP = document.querySelector('.maxLengthP-name');

  maxLengthP.innerHTML = length + " / 30";

  if (length < 15) {
    maxLengthP.style.color = "#609966";
  }

  else if (length < 20) {
    maxLengthP.style.color = "#F0997D";
  }

  else if (length <= 30) {
    maxLengthP.style.color = "#E84545";
  }
})

document.getElementById('edit-name-input').addEventListener('input', function () {
  const length = this.value.length;
  const maxLengthP = document.querySelector('.maxLengthP-edit');

  maxLengthP.innerHTML = length + " / 30";

  if (length < 15) {
    maxLengthP.style.color = "#609966";
  }

  else if (length < 20) {
    maxLengthP.style.color = "#F0997D";
  }

  else if (length <= 30) {
    maxLengthP.style.color = "#E84545";
  }
})
