/**
 * Created by corkr03 on 3/20/17.
 */
Ext.define('RallyTechServices.ui.combobox.DynamicFieldValueCombobox',{
    extend: 'Rally.ui.combobox.FieldValueComboBox',
    alias: 'widget.dynamicfieldvaluecombobox',

    _populateStore: function() {

        if (!this.field || this.field.length === '' || this.field.name === "_type") {
            this.setDisabled(true);
            this.onReady();
            return;
        }
        this.setDisabled(false);
        this._loadStoreValues();
    },
    refreshWithNewField: function(fieldName){
        this.field = this.model.getField(fieldName);
        this._populateStore();
    },
    setValue: function(value) {
        if (Ext.isString(value)){
            value = value.split(',');
        }
        this.callParent(value);
    }
});