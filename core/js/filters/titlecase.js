/**************************************************
 *             Titlecase Filter                   *
 *           Make text Title Case                 *
 **************************************************/

angular.module('cosmo').filter('titlecase', function(){
    return function(input){
        if(typeof input === 'string' && input){
            var words = input.split(' ');
            var exceptions = ' the a an also and but or for nor aboard about above across after against along amid among around as at atop before behind below beneath beside between beyond by despite down during for from in is inside into like near of off on onto out outside over past regarding round since than through throughout till to toward under unlike until up upon with within without ';
            for(var i=0; i<words.length; i++){
                if((i===0 || i===words.length-1 || exceptions.indexOf(' '+words[i].toLowerCase()+' ') === -1) && words[i])
                    words[i] = words[i][0].toUpperCase() + words[i].substring(1).toLowerCase();
                else
                    words[i] = words[i].toLowerCase();
            }
            return words.join(' ');
        } else
            return '';
    };
});
