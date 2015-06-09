/**************************************************
 *            Responsive Factory                  *
 *         Handles responsive images              *
 **************************************************/

angular.module('cosmo').factory('Responsive', ['$http', function($http){
    return {
        resize: function(imageURL, maxSize){

            // Make sure the image URL is a string, responsive feature isn't disabled, and the image isn't already a smaller size.
            if(!angular.isString(imageURL) || maxSize === 'nonresponsive' || imageURL.indexOf('-2048') > 0 || imageURL.indexOf('-1024.') > 0 || imageURL.indexOf('-512.') > 0 || imageURL.indexOf('-320.') > 0)
                return imageURL;

            var width = window.innerWidth;

            // Check for retina displays
            if(window.devicePixelRatio > 1)
                width = width * window.devicePixelRatio;

            // Check screen size for responsive images
            if(width >= 2048)
                var quality = 2048;
            else if(width >= 1024)
                var quality = 1024;
            else if(width >= 512)
                var quality = 512;
            else
                var quality = 320;

            // Make sure the image isn't larger than the max size
            if(maxSize){
                switch(maxSize){
                    case 'large':
                        if(quality > 1024)
                            quality = 1024;
                        break;
                    case 'medium':
                        if(quality > 512)
                            quality = 512;
                        break;
                    case 'small':
                        quality = 320;
                        break;
                    default:
                        break;
                }
            }

            var pos = imageURL.lastIndexOf('.');
            return imageURL.substring(0,pos)+'-'+quality+'.'+imageURL.substring(pos+1);
        }
    };
}]);
