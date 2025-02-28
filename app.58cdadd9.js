window.showAlert=function(e,i="info",s=0){let t={info:{class:"alert-info",icon:"bi-info-circle"},success:{class:"alert-success",icon:"bi-check-circle"},warning:{class:"alert-warning",icon:"bi-exclamation-triangle"},error:{class:"alert-danger",icon:"bi-exclamation-circle"}},l=t[i]?.class||"alert-info",a=t[i]?.icon||"bi-info-circle",c=document.createElement("div");return c.className=`alert ${l} alert-dismissible fade show position-fixed`,c.style.bottom="20px",c.style.left="20px",c.style.zIndex="9999",c.style.maxWidth="400px",c.innerHTML=`
        <i class="bi ${a} me-2"></i>
        ${e}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `,document.body.appendChild(c),s>0&&setTimeout(()=>{c.classList.remove("show"),setTimeout(()=>c.remove(),300)},s),c};
//# sourceMappingURL=app.58cdadd9.js.map
