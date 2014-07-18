// *** Headline to shrink for smaller screens *** //
(function() {
    
    setTimeout(
        function() 
        {
            jQuery(".responsive_headline").fitText(1.2, { minFontSize: '55px', maxFontSize: '80px' })
            jQuery(".responsive_headline1").fitText(1.2, { minFontSize: '25px', maxFontSize: '40px' })
            
            // *** Mobile Navigation *** //
            $("#nav").addClass("js").before('<div id="menu"><a class="icon-menu"></a></div>');
            $("#menu").click(function(){
                $("#nav").toggle();
            });
            
            $("[menu='primary']").click(function(){
                if(window.innerWidth <= 768)
                    $("#nav").hide();
            });

            $(window).resize(function(){
                if(window.innerWidth > 768) {
                    $("#nav").removeAttr("style");
                }
            });
        }, 1000);
})();