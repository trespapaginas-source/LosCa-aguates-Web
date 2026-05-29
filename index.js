(function () {
  "use strict";

  // ==========================================
  // 1. REVELACIÓN DE ELEMENTOS CON SCROLL (IntersectionObserver)
  // ==========================================
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('active');
      }
    });
  }, {
    threshold: 0.02,
    rootMargin: "0px 0px -50px 0px"
  });
  
  // Variables globales para la selección de fechas y plan
  let selectionStart = new Date();
  selectionStart.setHours(0, 0, 0, 0);
  let selectionEnd = new Date();
  selectionEnd.setDate(selectionEnd.getDate() + 1);
  selectionEnd.setHours(0, 0, 0, 0);
  let hoverDate = null;
  let selectedPlan = 'Hospedaje'; // Por defecto, el primer tab activo
  
  const calendarRenderFns = [];
  const syncBlockedDates = new Set();
  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);
  
  // Nombres de meses y días para formateo en español
  const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  const monthShortNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  const dayNames = ["Do", "Lu", "Ma", "Mi", "Ju", "Vi", "Sa"];
  
  // Inicialización de fechas bloqueadas (fines de semana + algunos días de ejemplo)
  for (let i = 0; i < 60; i++) {
    const d = new Date(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate() + i);
    // Bloquear fines de semana (Sábado=6, Domingo=0) y algunos días específicos simulados
    if (d.getDay() === 0 || d.getDay() === 6 || i === 12 || i === 25 || i === 41) {
      syncBlockedDates.add(new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0).getTime());
    }
  }
  
  // ==========================================
  // 2. FUNCIÓN PARA COMPILAR EL PLAN DESDE EL BOTÓN / TABS
  // ==========================================
  window.setFormPlan = function(planName) {
    if (planName === 'Estadía' || planName === 'Hospedaje') {
      selectedPlan = 'Hospedaje';
      if (selectionStart && selectionEnd && selectionStart.getTime() === selectionEnd.getTime()) {
        const nextDay = new Date(selectionStart);
        nextDay.setDate(nextDay.getDate() + 1);
        selectionEnd = nextDay;
      }
    } else if (planName === 'Pasadía') {
      selectedPlan = 'Pasadía';
      if (selectionStart) {
        selectionEnd = selectionStart;
      }
    } else if (planName === 'Eventos') {
      selectedPlan = 'Eventos';
    }
    
    const planSelect = document.getElementById('booking-plan');
    if (planSelect) {
      planSelect.value = selectedPlan;
    }
    
    updateCalendarOutputs();
    calendarRenderFns.forEach(fn => fn());
  };
  
  // ==========================================
  // 3. STEPPER PARA CANTIDAD DE PERSONAS (BOOKING BAR)
  // ==========================================
  let currentGuests = 5;
  window.adjustGuests = function(amount) {
    currentGuests = currentGuests + amount;
    if (currentGuests < 1) currentGuests = 1;
    const maxCapacity = (selectedPlan === 'Pasadía') ? 130 : 54;
    if (currentGuests > maxCapacity) currentGuests = maxCapacity;
    
    const valEl = document.getElementById('booking-guests-val');
    if (valEl) valEl.textContent = currentGuests;
  };
  
  // ==========================================
  // 4. FUNCIÓN PARA ACTUALIZAR SALIDAS Y FORMULARIOS
  // ==========================================
  // Helper to generate the WhatsApp message with dynamic pricing
  const getWhatsAppMessage = (plan, dateStr, guests, start, end) => {
    const numGuests = parseInt(guests) || 1;
    let budgetStr = '';
    if (plan === 'Pasadía') {
      const total = numGuests * 35000;
      budgetStr = `\n💰 Valor Estimado: $${total.toLocaleString('es-CO')} COP ($35.000 por persona)`;
    } else if (plan === 'Hospedaje') {
      let nights = 1;
      if (start && end) {
        const diffTime = Math.abs(end.getTime() - start.getTime());
        nights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (nights < 1) nights = 1;
      }
      const total = numGuests * 75000 * nights;
      budgetStr = `\n💰 Valor Estimado: $${total.toLocaleString('es-CO')} COP ($75.000 por persona por noche · ${nights} ${nights === 1 ? 'noche' : 'noches'})`;
    }
    return `¡Hola Cabaña Los Cañaguates! 🌴✨\nMe gustaría cotizar una reserva con los siguientes detalles:\n\n📅 Plan: ${plan}\n📆 Fechas: ${dateStr}\n👥 Cantidad de Personas: ${numGuests} personas${budgetStr}\n\nQuedo atento a la disponibilidad y tarifas. ¡Muchas gracias!`;
  };

  const updateCalendarOutputs = () => {
    const btnCotizar = document.getElementById('btn-cotizar');
    const checkinInput = document.getElementById('booking-checkin');
    const checkoutInput = document.getElementById('booking-checkout');
    const planSelect = document.getElementById('booking-plan');
  
    // Ajustar la cantidad de huéspedes si supera la capacidad máxima para el plan activo
    const maxCapacity = (selectedPlan === 'Pasadía') ? 130 : 54;
    const valEl = document.getElementById('booking-guests-val');
    if (valEl) {
      let guests = parseInt(valEl.textContent) || 5;
      if (guests > maxCapacity) {
        guests = maxCapacity;
        valEl.textContent = guests;
        currentGuests = guests; // Sincroniza la variable global
      }
    }
  
    const toISODate = (d) => {
      if (!d) return "";
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
  
    const formatFull = (d) => {
      if (!d) return "";
      return `${d.getDate()} ${monthShortNames[d.getMonth()]}`;
    };
  
    // Actualizar valores de la barra de reservas superior (inputs)
    if (checkinInput) {
      checkinInput.value = selectionStart ? toISODate(selectionStart) : "";
    }
    if (checkoutInput) {
      checkoutInput.value = selectionEnd ? toISODate(selectionEnd) : "";
    }
    if (planSelect) {
      planSelect.value = selectedPlan;
    }
  
    // Habilitar o deshabilitar botón del calendario principal con enlace dinámico de WhatsApp
    if (btnCotizar) {
      if (selectionStart && selectionEnd) {
        const guests = document.getElementById('booking-guests-val') ? document.getElementById('booking-guests-val').textContent.trim() : '5';
        let dateStr = '';
        if (selectionStart.getTime() === selectionEnd.getTime()) {
          dateStr = formatFull(selectionStart);
        } else {
          dateStr = `${formatFull(selectionStart)} - ${formatFull(selectionEnd)}`;
        }
  
        const message = getWhatsAppMessage(selectedPlan, dateStr, guests, selectionStart, selectionEnd);
  
        btnCotizar.textContent = 'Solicitar Reserva por WhatsApp';
        btnCotizar.href = `https://api.whatsapp.com/send/?phone=573103781745&text=${encodeURIComponent(message)}`;
        btnCotizar.target = '_blank';
        btnCotizar.style.pointerEvents = 'auto';
        btnCotizar.style.opacity = '1';
        btnCotizar.classList.remove('btn-disabled');
      } else {
        btnCotizar.textContent = 'Selecciona tus fechas';
        btnCotizar.style.pointerEvents = 'none';
        btnCotizar.style.opacity = '0.4';
        btnCotizar.classList.add('btn-disabled');
        btnCotizar.removeAttribute('href');
      }
    }
  };
  
  // ==========================================
  // 5. CLASES DE SELECCIÓN EN LA GRILLA
  // ==========================================
  const updateCalendarSelection = (calRoot) => {
    const days = calRoot.querySelectorAll('.calendar-day:not(.empty)');
    days.forEach(dayEl => {
      const cellDate = new Date(Number(dayEl.dataset.timestamp));
      
      const isPast = dayEl.classList.contains('past');
      const isBlocked = dayEl.classList.contains('blocked');
      const isToday = dayEl.classList.contains('today');
      
      dayEl.className = 'calendar-day';
      if (isPast) dayEl.classList.add('past');
      if (isBlocked) dayEl.classList.add('blocked');
      if (isToday) dayEl.classList.add('today');
      
      if (selectionStart && cellDate.getTime() === selectionStart.getTime()) {
        dayEl.classList.add('selected', 'range-start');
      }
      if (selectionEnd && cellDate.getTime() === selectionEnd.getTime()) {
        dayEl.classList.add('selected', 'range-end');
      }
      
      if (selectionStart && selectionEnd) {
        if (selectionStart.getTime() === selectionEnd.getTime()) {
          if (cellDate.getTime() === selectionStart.getTime()) {
            dayEl.classList.add('selected', 'range-start', 'range-end');
          }
        } else {
          if (cellDate.getTime() > selectionStart.getTime() && cellDate.getTime() < selectionEnd.getTime()) {
            dayEl.classList.add('in-range');
          }
        }
      } else if (selectionStart && !selectionEnd && hoverDate) {
        if (cellDate.getTime() > selectionStart.getTime() && cellDate.getTime() <= hoverDate.getTime()) {
          dayEl.classList.add('in-range');
          if (cellDate.getTime() === hoverDate.getTime()) dayEl.classList.add('range-end');
        }
      }
    });
  };
  
  // ==========================================
  // 6. INICIALIZADOR DE CALENDARIO INDIVIDUAL
  // ==========================================
  function buildCalendarInstance(rootId) {
    const calRoot = document.getElementById(rootId);
    if (!calRoot) return;
  
    let calMonthDate = new Date();
    calMonthDate.setDate(1);
  
    const renderInstance = () => {
      calRoot.innerHTML = '';
      const wrapper = document.createElement('div');
      wrapper.className = 'custom-calendar';
  
      // Encabezado del Mes
      const header = document.createElement('div');
      header.className = 'calendar-header';
      
      const prevBtn = document.createElement('button');
      prevBtn.className = 'calendar-nav';
      prevBtn.type = 'button';
      prevBtn.innerHTML = '<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"></path></svg>';
      prevBtn.addEventListener('click', (e) => {
        e.preventDefault();
        calMonthDate.setMonth(calMonthDate.getMonth() - 1);
        renderInstance();
      });
  
      const nextBtn = document.createElement('button');
      nextBtn.className = 'calendar-nav';
      nextBtn.type = 'button';
      nextBtn.innerHTML = '<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"></path></svg>';
      nextBtn.addEventListener('click', (e) => {
        e.preventDefault();
        calMonthDate.setMonth(calMonthDate.getMonth() + 1);
        renderInstance();
      });
  
      const title = document.createElement('h3');
      title.textContent = `${monthNames[calMonthDate.getMonth()]} ${calMonthDate.getFullYear()}`;
  
      header.appendChild(prevBtn);
      header.appendChild(title);
      header.appendChild(nextBtn);
      wrapper.appendChild(header);
  
      // Cabecera de días de la semana
      const gridHeader = document.createElement('div');
      gridHeader.className = 'calendar-grid-header';
      dayNames.forEach(day => {
        const d = document.createElement('div');
        d.textContent = day;
        gridHeader.appendChild(d);
      });
      wrapper.appendChild(gridHeader);
  
      // Grilla del calendario
      const grid = document.createElement('div');
      grid.className = 'calendar-grid';
  
      const year = calMonthDate.getFullYear();
      const month = calMonthDate.getMonth();
      const firstDayIndex = new Date(year, month, 1).getDay();
      const lastDay = new Date(year, month + 1, 0).getDate();
  
      // Celdas vacías del mes anterior
      for (let i = 0; i < firstDayIndex; i++) {
        const emptyCell = document.createElement('div');
        emptyCell.className = 'calendar-day empty';
        grid.appendChild(emptyCell);
      }
  
      // Renderizar días del mes activo
      for (let i = 1; i <= lastDay; i++) {
        const cellDate = new Date(year, month, i);
        const dayEl = document.createElement('div');
        dayEl.className = 'calendar-day';
        dayEl.textContent = i;
        dayEl.dataset.timestamp = cellDate.getTime();
  
        // Deshabilitar fechas pasadas y bloqueadas
        if (cellDate.getTime() === todayDate.getTime()) {
          dayEl.classList.add('today');
        }
        if (cellDate.getTime() < todayDate.getTime()) {
          dayEl.classList.add('past');
        } else if (syncBlockedDates.has(cellDate.getTime())) {
          dayEl.classList.add('blocked');
        } else {
          // Evento de clic sobre días disponibles
          dayEl.addEventListener('click', (e) => {
            e.preventDefault();
            if (selectedPlan === 'Pasadía') {
              // El pasadía es de un único día
              selectionStart = cellDate;
              selectionEnd = cellDate;
            } else {
              // Estadías normales (rango)
              if (!selectionStart || (selectionStart && selectionEnd)) {
                selectionStart = cellDate;
                selectionEnd = null;
              } else if (selectionStart && !selectionEnd) {
                if (cellDate.getTime() < selectionStart.getTime()) {
                  selectionStart = cellDate;
                } else if (cellDate.getTime() === selectionStart.getTime()) {
                  selectionStart = null;
                } else {
                  selectionEnd = cellDate;
                }
              }
            }
            updateCalendarOutputs();
            calendarRenderFns.forEach(fn => fn());
          });
  
          // Eventos de hover para dibujar rangos
          dayEl.addEventListener('mouseenter', () => {
            if (selectedPlan !== 'Pasadía' && selectionStart && !selectionEnd && cellDate.getTime() > selectionStart.getTime()) {
              if (!hoverDate || hoverDate.getTime() !== cellDate.getTime()) {
                hoverDate = cellDate;
                calendarRenderFns.forEach(fn => fn());
              }
            }
          });
        }
        grid.appendChild(dayEl);
      }
  
      wrapper.appendChild(grid);
  
      // Limpiar hover cuando se sale de la grilla
      grid.addEventListener('mouseleave', () => {
        if (selectionStart && !selectionEnd) {
          hoverDate = null;
          calendarRenderFns.forEach(fn => fn());
        }
      });
  
      calRoot.appendChild(wrapper);
      updateCalendarSelection(calRoot);
    };
  
    // Registrar función de actualización
    calendarRenderFns.push(() => {
      updateCalendarSelection(calRoot);
    });
  
    renderInstance();
  }
  
  // ==========================================
  // 7. RESERVA DIRECTA A TRAVÉS DE WHATSAPP
  // ==========================================
  
  // ==========================================
  // 8. INICIALIZADOR PRINCIPAL DE LA APP
  // ==========================================
  function initApp() {
    // Observar elementos con la clase .reveal
    document.querySelectorAll('.reveal').forEach(el => {
      revealObserver.observe(el);
    });
  
    // Clase scrolled en el Navbar al desplazar
    const navbar = document.getElementById('navbar');
    if (navbar) {
      window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
          navbar.classList.add('scrolled');
        } else {
          navbar.classList.remove('scrolled');
        }
      });
    }
  
    // Alternancia del menú móvil
    const menuToggle = document.getElementById('menu-toggle');
    const mobileMenu = document.getElementById('mobile-menu');
    const navbarEl = document.getElementById('navbar');
    
    if (menuToggle && mobileMenu) {
      const toggleMenu = () => {
        const isActive = mobileMenu.classList.contains('is-active');
        if (isActive) {
          mobileMenu.classList.remove('is-active');
          if (navbarEl) navbarEl.classList.remove('menu-open');
          mobileMenu.setAttribute('aria-hidden', 'true');
          menuToggle.setAttribute('aria-expanded', 'false');
          menuToggle.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>';
          document.body.style.overflow = '';
        } else {
          mobileMenu.classList.add('is-active');
          if (navbarEl) navbarEl.classList.add('menu-open');
          mobileMenu.setAttribute('aria-hidden', 'false');
          menuToggle.setAttribute('aria-expanded', 'true');
          menuToggle.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
          document.body.style.overflow = 'hidden';
        }
      };
      
      menuToggle.addEventListener('click', toggleMenu);
      
      // Cerrar menú al hacer clic en los enlaces de móvil
      mobileMenu.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
          if (mobileMenu.classList.contains('is-active')) {
            toggleMenu();
          }
        });
      });
    }
  
    // Acordeón de Comodidades / Amenidades (Airbnb Style)
    const btnVerMas = document.getElementById('btn-ver-mas-amenidades');
    const btnTextLabel = btnVerMas ? btnVerMas.querySelector('.btn-text-label') : null;
    const chevronIcon = btnVerMas ? btnVerMas.querySelector('.chevron-icon') : null;
    const hiddenAmenities = document.querySelectorAll('.airbnb-amenity.amenity-hidden');
    
    if (btnVerMas && hiddenAmenities.length > 0) {
      let expanded = false;
      btnVerMas.addEventListener('click', () => {
        expanded = !expanded;
        hiddenAmenities.forEach(el => {
          if (expanded) {
            el.style.display = 'flex';
            el.classList.remove('amenity-hidden');
          } else {
            el.style.display = 'none';
            el.classList.add('amenity-hidden');
          }
        });
        if (btnTextLabel) {
          btnTextLabel.textContent = expanded ? 'Mostrar menos comodidades' : 'Mostrar todas las 14 comodidades';
        }
        if (chevronIcon) {
          if (expanded) {
            chevronIcon.classList.add('rotated');
          } else {
            chevronIcon.classList.remove('rotated');
          }
        }
      });
    }
  
    // Activar/Desbloquear el Mapa de Google
    const tourOverlay = document.getElementById('tour-overlay');
    if (tourOverlay) {
      tourOverlay.addEventListener('click', () => {
        tourOverlay.classList.add('hidden');
      });
    }
  
    // Lógica del Acordeón de FAQs
    document.querySelectorAll('.faq-item').forEach(item => {
      const header = item.querySelector('.faq-header');
      header?.addEventListener('click', () => {
        item.classList.toggle('open');
      });
    });
  

  
    // Inicializar selector de plan en la tarjeta flotante
    const planSelect = document.getElementById('booking-plan');
    if (planSelect) {
      planSelect.addEventListener('change', (e) => {
        window.setFormPlan(e.target.value);
      });
    }
  
    // Inicializar Calendario
    buildCalendarInstance('custom-calendar-root');
  
    // Configuración de la barra de reserva (Booking Bar) clicks para desplazar al calendario
    const checkinField = document.getElementById('booking-field-checkin');
    const checkoutField = document.getElementById('booking-field-checkout');
    const bookingSubmitBtn = document.getElementById('booking-submit-btn');
    const checkinInput = document.getElementById('booking-checkin');
    const checkoutInput = document.getElementById('booking-checkout');
  
    if (checkinField && checkinInput) {
      checkinField.addEventListener('click', (e) => {
        if (e.target.id !== 'booking-checkin') {
          checkinInput.focus();
          if (typeof checkinInput.showPicker === 'function') {
            checkinInput.showPicker();
          }
        }
      });
    }
  
    if (checkoutField && checkoutInput) {
      checkoutField.addEventListener('click', (e) => {
        if (e.target.id !== 'booking-checkout') {
          checkoutInput.focus();
          if (typeof checkoutInput.showPicker === 'function') {
            checkoutInput.showPicker();
          }
        }
      });
    }
  
    if (checkinInput) {
      checkinInput.addEventListener('change', (e) => {
        if (e.target.value) {
          const parts = e.target.value.split('-');
          selectionStart = new Date(parts[0], parts[1] - 1, parts[2]);
          selectionStart.setHours(0, 0, 0, 0);
          
          if (selectedPlan === 'Pasadía') {
            selectionEnd = selectionStart;
          } else if (selectionEnd && selectionEnd.getTime() < selectionStart.getTime()) {
            selectionEnd = null;
          }
          
          updateCalendarOutputs();
          calendarRenderFns.forEach(fn => fn());
        } else {
          selectionStart = null;
          updateCalendarOutputs();
          calendarRenderFns.forEach(fn => fn());
        }
      });
    }
  
    if (checkoutInput) {
      checkoutInput.addEventListener('change', (e) => {
        if (e.target.value) {
          const parts = e.target.value.split('-');
          const tempEnd = new Date(parts[0], parts[1] - 1, parts[2]);
          tempEnd.setHours(0, 0, 0, 0);
          
          if (selectedPlan === 'Pasadía') {
            selectionStart = tempEnd;
            selectionEnd = tempEnd;
          } else {
            if (selectionStart && tempEnd.getTime() >= selectionStart.getTime()) {
              selectionEnd = tempEnd;
            } else {
              selectionStart = tempEnd;
              selectionEnd = null;
            }
          }
          
          updateCalendarOutputs();
          calendarRenderFns.forEach(fn => fn());
        } else {
          selectionEnd = null;
          updateCalendarOutputs();
          calendarRenderFns.forEach(fn => fn());
        }
      });
    }
    
    if (bookingSubmitBtn) {
      bookingSubmitBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const guests = document.getElementById('booking-guests-val') ? document.getElementById('booking-guests-val').textContent.trim() : '5';
        let dateStr = 'Por definir';
        if (selectionStart && selectionEnd) {
          const formatFull = (d) => `${d.getDate()} ${monthShortNames[d.getMonth()]}`;
          if (selectionStart.getTime() === selectionEnd.getTime()) {
            dateStr = formatFull(selectionStart);
          } else {
            dateStr = `${formatFull(selectionStart)} - ${formatFull(selectionEnd)}`;
          }
        }
        const message = getWhatsAppMessage(selectedPlan, dateStr, guests, selectionStart, selectionEnd);
        window.open(`https://api.whatsapp.com/send/?phone=573103781745&text=${encodeURIComponent(message)}`, '_blank');
      });
    }
  
    // Configuración de Lightbox para la Galería Infinita
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = lightbox ? lightbox.querySelector('.lightbox-img') : null;
    const lightboxClose = lightbox ? lightbox.querySelector('.lightbox-close') : null;
    const galleryImages = document.querySelectorAll('.infinite-gallery-track img');
  
    if (lightbox && lightboxImg && lightboxClose) {
      galleryImages.forEach(img => {
        img.style.cursor = 'pointer';
        img.addEventListener('click', () => {
          lightboxImg.src = img.src;
          lightboxImg.alt = img.alt;
          lightbox.classList.add('is-open');
          lightbox.setAttribute('aria-hidden', 'false');
          document.body.style.overflow = 'hidden';
        });
      });
  
      const closeLightbox = () => {
        lightbox.classList.remove('is-open');
        lightbox.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
        setTimeout(() => { lightboxImg.src = ''; }, 300);
      };
  
      lightboxClose.addEventListener('click', closeLightbox);
      
      lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox) {
          closeLightbox();
        }
      });
  
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && lightbox.classList.contains('is-open')) {
          closeLightbox();
        }
      });
    }
  
    // Sincronizar el estado inicial al cargar la página
  
    // Sincronizar el input inicial al cargar la página
    updateCalendarOutputs();
  }
  
  // Iniciar aplicación
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }

})();
