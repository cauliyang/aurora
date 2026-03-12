function showAlert(e,i="info",s=0){let t={info:{class:"alert-info",icon:"bi-info-circle"},success:{class:"alert-success",icon:"bi-check-circle"},warning:{class:"alert-warning",icon:"bi-exclamation-triangle"},error:{class:"alert-danger",icon:"bi-exclamation-circle"}},l=t[i]?.class||"alert-info",o=t[i]?.icon||"bi-info-circle",a=document.createElement("div");return a.className=`alert ${l} alert-dismissible fade show position-fixed`,a.style.bottom="20px",a.style.left="20px",a.style.zIndex="9999",a.style.maxWidth="400px",a.innerHTML=`
        <i class="bi ${o} me-2"></i>
        ${e}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `,document.body.appendChild(a),s>0&&setTimeout(()=>{a.classList.remove("show"),setTimeout(()=>a.remove(),300)},s),a}window.showAlert=showAlert;
//# sourceMappingURL=app.47a91cea.js.map
