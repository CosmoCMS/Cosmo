/**************************************************
 *             WYSIWYG Controller                 *
 **************************************************/

angular.module('cosmo').controller('wysiwygCtrl', ['$scope', '$rootScope', 'Page', function($scope, $rootScope, Page){

    $scope.editor = {};
    $scope.editor.url = [];
    $scope.editor.text = [];
    $scope.editor.classes = [];
    $scope.editor.selected = '';
    $scope.editor.letter = 0;
    $scope.editor.rows = 5;
    $scope.editor.cols = 4;
    $scope.editor.pastedTable = '';
    $scope.lastKeyPress;

    // Initialize text input with selection if available
    if(Page.misc.wysiwyg.selection)
        $scope.editor.text = Page.misc.wysiwyg.selection.split('');

    // Watch for pasted text
    angular.element(document).on('paste', function(event){
        if(event.clipboardData.getData('text/plain'))
            var pastedText = event.clipboardData.getData('text/plain');
        else
            var pastedText = event.originalEvent.clipboardData.getData('text/plain');

        // Check if they are in the table modal
        if($scope.pastingTable === true){
            $scope.editor.pastedTable = pastedText;
            $scope.editor.pastedTableRows = [];
            angular.forEach(pastedText.split("\n"), function(row){
                $scope.editor.pastedTableRows.push(row.split("\t"));
            });
        } else { // User is in link modal
            $scope.editor[$scope.editor.selected].splice($scope.editor.letter, 0, pastedText);
            $scope.editor.letter += pastedText.length;
        }
        $scope.$apply();
        event.preventDefault();
    });

    // Watch all keypresses
    angular.element(document).on('keydown', function(event){

        // If the modal is open, log keypresses to the modal instead of the window
        if(Page.misc.wysiwyg.modalOpen){
            // Watch for paste commands
            if(($scope.lastKeyPress === 91 || $scope.lastKeyPress === 17) && event.keyCode === 86)
                return true;

            if(event.keyCode === 8) { // delete key
                $scope.editor.letter = $scope.editor.letter-1;
                $scope.editor[$scope.editor.selected].splice($scope.editor.letter, 1);
            } else {
                var character = '';
                // Standard letter character
                if(event.keyCode >= 65 && event.keyCode <= 90){
                    character = String.fromCharCode(event.keyCode);
                    if(!event.shiftKey)
                        character = character.toLowerCase();
                } else if(event.keyCode >= 48 && event.keyCode <= 57){
                    // Number
                    if(!event.shiftKey)
                        character = String.fromCharCode(event.keyCode);
                    else {
                        // Punctuation above numbers
                        switch(event.keyCode){
                            case 48:
                                character = ')';
                                break;
                            case 49:
                                character = '!';
                                break;
                            case 50:
                                character = '@';
                                break;
                            case 51:
                                character = '#';
                                break;
                            case 52:
                                character = '$';
                                break;
                            case 53:
                                character = '%';
                                break;
                            case 54:
                                character = '^';
                                break;
                            case 55:
                                character = '&';
                                break;
                            case 56:
                                character = '*';
                                break;
                            case 57:
                                character = '(';
                                break;
                            default:
                                break;
                        }
                    }
                } else {
                    // Check for special characters
                    switch(event.keyCode){

                        case 32:
                            character = ' ';
                            break;

                        case 186:
                            if(event.shiftKey)
                                character = ':';
                            else
                                character = ';';
                            break;

                        case 187:
                            if(event.shiftKey)
                                character = '+';
                            else
                                character = '=';
                            break;

                        case 188:
                            if(event.shiftKey)
                                character = '<';
                            else
                                character = ',';
                            break;

                        case 189:
                            if(event.shiftKey)
                                character = '_';
                            else
                                character = '-';
                            break;

                        case 190:
                            if(event.shiftKey)
                                character = '>';
                            else
                                character = '.';
                            break;

                        case 191:
                            if(event.shiftKey)
                                character = '?';
                            else
                                character = '/';
                            break;

                        case 192:
                            if(event.shiftKey)
                                character = '~';
                            else
                                character = '`';
                            break;

                        case 219:
                            if(event.shiftKey)
                                character = '{';
                            else
                                character = '[';
                            break;

                        case 220:
                            if(event.shiftKey)
                                character = '|';
                            else
                                character = '\\';
                            break;

                        case 221:
                            if(event.shiftKey)
                                character = '}';
                            else
                                character = ']';
                            break;

                        case 222:
                            if(event.shiftKey)
                                character = '"';
                            else
                                character = "'";
                            break;

                        default:
                            break;
                    }
                }

                if(character !== '') {
                    $scope.editor[$scope.editor.selected].splice($scope.editor.letter, 0, character);
                    $scope.editor.letter++;
                }
            }

            $scope.$apply();
            $scope.lastKeyPress = event.keyCode;
            if(event.keyCode !== 91 && event.keyCode !== 17) // Don't prevent Ctrl and Command keys
                event.preventDefault();
        }
    });

    // Clicked an input-like div
    $scope.clicked = function(event, item) {
        $scope.editor.selected = item; // Keep track of which variable is being edited
        $scope.editor.letter = $scope.editor[$scope.editor.selected].length;
        event.preventDefault(); // Don't take focus of WYSIWYG word(s)
    };

    // Clicked a letter in that div
    $scope.clickedLetter = function(index) {
        $scope.editor.letter = index;
    };

    // Check the URL to activate the open in new tab box automatically
    $scope.urlChanged = function() {
        // Check if it's a file from the uploads folder. e.g. PDF files
        if($scope.editor.url.indexOf('uploads/') === 0)
            $scope.editor.newTab = true;
    };

    // Insert a new link
    $scope.insertLink = function(){
        var newTab = '';
        var url = $scope.editor.url.join('');

        // Check if link should open in a new tab
        if($scope.editor.newTab)
            var newTab = '_blank';

        // If they meant to redirect to a url, make sure it has http://
        if(url.indexOf('www.') === 0)
            url = 'http://' + url;

        document.execCommand('insertHTML', false, '<a href="'+ url +'" target="'+ newTab +'" class="'+ $scope.editor.classes.join('') +'">'+ $scope.editor.text.join('') +'</a>');
    };

    // Insert a table
    $scope.createTable = function(){
        var timestamp = new Date().getTime();
        var rows = [];
        var cols = [];

        // Check if the user pasted a table in the box
        if($scope.editor.pastedTable){
            var pastedTableRows = $scope.editor.pastedTable.split("\n");
            // Iterate through each row
            angular.forEach(pastedTableRows, function(row){
                var cellData = [];
                var cols = row.split("\t");
                // Iterate through each column
                angular.forEach(cols, function(col){
                    cellData.push(col);
                });
                // Don't add an empty row at the beginning or end
                if(cellData.length > 1 || cellData[0] !== '')
                    rows.push(cellData);
            });
        } else {
            // Create empty columns
            for(var i=0; i<$scope.editor.cols; i++)
                cols.push('');
            // Create rows with columns
            for(var i=0; i<$scope.editor.rows; i++)
                rows.push(cols);
        }

        Page.extras[timestamp] = angular.toJson(rows);

        document.execCommand('insertHTML', false, '<div cs-table="'+ timestamp +'"></div>');
        $rootScope.$broadcast('saveAndRefresh');
    };

}]);
