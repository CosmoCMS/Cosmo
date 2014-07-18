// Allow the user to create/edit a table
app.controller('tableCreatorCtrl', function($scope){

    // Initialize values
    $scope.numColumns = 1;
    $scope.selectedCol = 0;
    $scope.selectedRow = 0;
    $scope.rows = [
        {columns: [{data: ''}, {data: ''}] },
        {columns: [{data: ''}, {data: ''}] }
    ];

    // Add a row right after the selected row
    $scope.addRow = function(){
        var columns = [{data: ''}];
        for(var i = 0; i < $scope.numColumns; i++)
            columns.push({data: ''});
        $scope.rows.splice($scope.selectedRow + 1, 0, {columns: columns});
    };

    // Remove the selected row
    $scope.removeRow = function(index){
        $scope.rows.splice(index, 1);
    };

    // Add a new column after the selected column
    $scope.addColumn = function(){
        $scope.numColumns++;
        for(var i = 0; i < $scope.rows.length; i++)
            $scope.rows[i].columns.splice($scope.selectedCol + 1, 0, {data: ''});
    };

    // Remove the selected column
    $scope.removeColumn = function(){
        $scope.numColumns--;
        for(var i = 0; i < $scope.rows.length; i++)
            $scope.rows[i].columns.splice($scope.selectedCol, 1);
    };

    // Select Column
    $scope.selectCol = function(index){
        $scope.selectedCol = index;
    };

    // Select Row
    $scope.selectRow = function(index){
        $scope.selectedRow = index;
    };

    // Get the table HTML
    $scope.getData = function(){
        var html = '<table>';
        for(var i=0; i<$scope.rows.length; i++){
            html += '<tr>';
            for(var j=0; j<$scope.rows[i].columns.length; j++)
                html += '<td>' + $scope.rows[i].columns[j].data + '</td>';

            html += '</tr>';
        }
        html += '</table>';
        console.log(html);
    };
});