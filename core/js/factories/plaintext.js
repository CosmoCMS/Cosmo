/**************************************************
 *              Plaintext Filter                  *
 *   Filter out any HTML and return plain text    *
 **************************************************/

angular.module('cosmo').filter('plaintext', function(){
    return function(input){
        if(input){
            return input.replace(/<[^<]+?>/g, '').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ');
        } else
            return input;
    };
});
