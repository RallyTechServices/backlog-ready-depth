Ext.define('RallyTechServices.backlogreadydepth.utils.Toolbox',{
    singleton: true,

    fetchWsapiRecords: function(config, storeType){
        var deferred = Ext.create('Deft.Deferred');

        if (!storeType){
            storeType = 'Rally.data.wsapi.Store';
        }

        if (!config.limit){
            config.limit = "Infinity";
        }
        if (!config.pageSize){
            config.pageSize = 2000;
        }

        Ext.create(storeType,config).load({
            callback: function(records, operation){
                if (operation.wasSuccessful()){
                    deferred.resolve(records);
                } else {
                    deferred.reject("Error fetching from store for: " + operation.error.errors.join(","));
                }
            }
        });
        return deferred.promise;
    },
    fetchWsapiArtifactRecords: function(config){
        return RallyTechServices.backlogreadydepth.utils.Toolbox.fetchWsapiRecords(config, "Rally.data.wsapi.artifact.Store");
    },
    fetchLookbackSnapshots: function(config){
        var deferred = Ext.create('Deft.Deferred');

        config.removeUnauthorizedSnapshots = true;
        //if (!config.limit){
            config.limit = "Infinity";
        //}

        Ext.create('Rally.data.lookback.SnapshotStore', config).load({
            callback: function(records, operation){
                if (operation.wasSuccessful()){
                    deferred.resolve(records);
                } else {
                    deferred.reject('Error loading snapshots: ' + operation.error.errors.join(','));
                }
            }
        });

        return deferred;
    },
    getHighchartsColorWithOpacity: function(color, opacity){
        var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(color);
        if (result){
           // return rgba(parseInt(result[1], 16),parseInt(result[2], 16),parseInt(result[3], 16),opacity);
            return Ext.String.format('rgba({0},{1},{2},{3})',
                parseInt(result[1], 16),
                parseInt(result[2], 16),
                parseInt(result[3], 16),
                opacity
            );
        }
        return null;
    },
    saveCSVToFile:function(csv,file_name,type_object){
        if (type_object === undefined){
            type_object = {type:'text/csv;charset=utf-8'};
        }
        this.saveAs(csv,file_name, type_object);
    },
    saveAs: function(textToWrite, fileName)
    {
        if (Ext.isIE9m){
            Rally.ui.notify.Notifier.showWarning({message: "Export is not supported for IE9 and below."});
            return;
        }

        var textFileAsBlob = null;
        try {
            textFileAsBlob = new Blob([textToWrite], {type:'text/plain'});
        }
        catch(e){
            window.BlobBuilder = window.BlobBuilder ||
                window.WebKitBlobBuilder ||
                window.MozBlobBuilder ||
                window.MSBlobBuilder;
            if (window.BlobBuilder && e.name == 'TypeError'){
                bb = new BlobBuilder();
                bb.append([textToWrite]);
                textFileAsBlob = bb.getBlob("text/plain");
            }

        }

        if (!textFileAsBlob){
            Rally.ui.notify.Notifier.showWarning({message: "Export is not supported for this browser."});
            return;
        }

        var fileNameToSaveAs = fileName;

        if (Ext.isIE10p){
            window.navigator.msSaveOrOpenBlob(textFileAsBlob,fileNameToSaveAs); // Now the user will have the option of clicking the Save button and the Open button.
            return;
        }

        var url = this.createObjectURL(textFileAsBlob);

        if (url){
            var downloadLink = document.createElement("a");
            if ("download" in downloadLink){
                downloadLink.download = fileNameToSaveAs;
            } else {
                //Open the file in a new tab
                downloadLink.target = "_blank";
            }

            downloadLink.innerHTML = "Download File";
            downloadLink.href = url;
            if (!Ext.isChrome){
                // Firefox requires the link to be added to the DOM
                // before it can be clicked.
                downloadLink.onclick = this.destroyClickedElement;
                downloadLink.style.display = "none";
                document.body.appendChild(downloadLink);
            }
            downloadLink.click();
        } else {
            Rally.ui.notify.Notifier.showError({message: "Export is not supported "});
        }

    },
    createObjectURL: function ( file ) {
        if ( window.webkitURL ) {
            return window.webkitURL.createObjectURL( file );
        } else if ( window.URL && window.URL.createObjectURL ) {
            return window.URL.createObjectURL( file );
        } else {
            return null;
        }
    },
    destroyClickedElement: function(event)
    {
        document.body.removeChild(event.target);
    }
});
