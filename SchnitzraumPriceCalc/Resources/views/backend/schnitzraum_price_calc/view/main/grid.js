//{block name="backend/article_list/view/main/grid"}
// {$smarty.block.parent}
Ext.define('Shopware.apps.SchnitzraumPriceCalc.view.main.Grid', {
    override: 'Shopware.apps.ArticleList.view.main.Grid',
    /**
     * Setup the component
     */
    initComponent: function () {
        var me = this;

        this.setupStateManager();

        me.columns = me.getColumns();

        me.tbar = me.getToolbar();
        me.bbar = me.getPagingbar();
        me.selModel = me.getGridSelModel();

        me.addEvents(
            /**
             * Fired when the user edited a product in the grid
             */
            'saveProduct',

            /**
             * Delete a single article
             */
            'deleteProduct',

            /**
             * Delete multiple articles
             */
            'deleteMultipleProducts',

            /**
             * Trigger the split view
             */
            'triggerSplitView',

            /**
             * Triggered when the product selection changes
             */
            'productchange',

            /**
             * A search was triggered
             */
            'search'
        );

        me.rowEditing = Ext.create('Ext.grid.plugin.RowEditing', {
            clicksToEdit: 2,
            autoCancel: true,
            listeners: {
                scope: me,
                edit: function (editor, context) {
                    me.fireEvent('saveProduct', editor, context)
                }
            }
        });
        me.plugins = me.rowEditing;

        me.listeners = {
            'afterrender': me.onAfterRender
        };

        me.callParent(arguments);
    },

    onAfterRender: function() {
        var me = this;
        Ext.each(me.columns, function(col) {
            if (col.dataIndex === 'Detail_active') {
                me.detailActiveColumn = col;
                window.setTimeout(function() { col.setVisible(false); }, 0);
            }
        });
    },

    setupStateManager: function () {
        var me = this;
        me.stateManager = new Ext.state.LocalStorageProvider({ });

        Ext.state.Manager.setProvider(me.stateManager);
    },

    /**
     * Creates rowEditor Plugin
     *
     * @return [Ext.grid.plugin.RowEditing]
     */
    getRowEditorPlugin: function () {
        return Ext.create('Ext.grid.plugin.RowEditing', {
            clicksToEdit: 2,
            errorSummary: false,
            pluginId: 'rowEditing'
        });
    },

    /**
     * Creates the grid selection model for checkboxes
     *
     * @return [Ext.selection.CheckboxModel] grid selection model
     */
    getGridSelModel: function () {
        var me = this;

        return Ext.create('Ext.selection.CheckboxModel', {
            listeners: {
                // Unlocks the delete button if the user has checked at least one checkbox
                selectionchange: function (sm, selections) {
                    me.deleteButton.setDisabled(selections.length === 0);
                    me.splitViewModeBtn.setDisabled(selections.length === 0);
                    me.fireEvent('productchange', selections);
                }
            }
        });
    },

    getActionColumn: function () {
        var me = this;


        return {
            xtype: 'actioncolumn',
            width: 60,
            items: [
                /*{if {acl_is_allowed resource=article privilege=save}}*/
                {
                    action: 'edit',
                    cls: 'editBtn',
                    iconCls: 'sprite-pencil',
                    handler: function (view, rowIndex, colIndex, item, opts, record) {
                        Shopware.app.Application.addSubApplication({
                            name: 'Shopware.apps.Article',
                            action: 'detail',
                            params: {
                                articleId: record.get('Article_id')
                            }
                        });
                    }
                },
                /*{/if}*/
                /*{if {acl_is_allowed resource=article privilege=delete}}*/
                {
                    iconCls: 'sprite-minus-circle-frame',
                    action: 'delete',
                    handler: function (view, rowIndex, colIndex, item, opts, record) {
                        me.fireEvent('deleteProduct', record);
                    }
                }
                /*{/if}*/
            ]
        };
    },

    /**
     * Helper method which creates the columns for the
     * grid panel in this widget.
     *
     * @return [array] generated columns
     */
    getColumns: function () {
        var me = this,
                colLength,
                i,
                column,
                stateColumn,
                columnDefinition,
                width,
                xtype,
                renderer,
                columns = [ ];

        colLength = me.columnConfig.length;
        for (i = 0; i < colLength; i++) {
            column = me.columnConfig[i];

            if (!column.allowInGrid) {
                continue;
            }

            columnDefinition = {
                dataIndex: column.alias,
                header: me.getTranslationForColumnHead(column.alias),
                /*{if {acl_is_allowed resource=article privilege=save}}*/
                editor: me.getEditorForColumn(column),
                /*{/if}*/
                hidden: !column.show
            };

            if (xtype = me.getXtypeForColumn(column)) {
                columnDefinition.xtype = xtype;
            }

            if (renderer = me.getRendererForColumn(column)) {
                columnDefinition.renderer = renderer;
            }


            if (width = me.getWidthForColumn(column)) {
                columnDefinition.width = width;
            } else {
                columnDefinition.flex = 1;
            }

            if (column.alias == 'Detail_active') {
                columnDefinition.hidden = true;
            }

            columns.push(columnDefinition);
        }

        columns.push({
            header: '{s name=list/column_info}Info{/s}',
            width: 90,
            renderer: me.infoColumnRenderer
        });

        columns.push(me.getActionColumn());

        return columns;
    },

    /**
     * Returns a proper xtype fo a column
     *
     * @param column
     * @returns *
     */
    getXtypeForColumn: function (column) {
        var me = this;

        if (column.alias === 'Price_price') {
            return 'numbercolumn';
        }

        return undefined;
    },

    /**
     * Column renderer for columns shown in <b>tags</b>
     *
     * @param value
     * @returns string
     */
    boldColumnRenderer: function (value, metaData, record) {
        var result = value;

        var additional = record.get('Detail_additionalText');
        if (!additional) {
            additional = record.get('Detail_additionalText_dynamic');
        }

        if (additional) {
            result = value + ' - ' + additional;
        }
        return '<b>' + this.defaultColumnRenderer(result) + '</b>';
    },

    /**
     * Column renderer for most of the columns
     *
     * @param value
     * @returns string
     */
    defaultColumnRenderer: function (value) {
        return value;
    },

    /**
     * Column renderer for boolean columns in order to
     * @param value
     */
    booleanColumnRenderer: function (value) {
        var checked = 'sprite-ui-check-box-uncheck';
        if (value == true) {
            checked = 'sprite-ui-check-box';
        }
        return '<span style="display:block; margin: 0 auto; height:25px; width:25px;" class="' + checked + '"></span>';
    },

    /**
     *
     * Show info like: Is this a configurator article / does it have images /
     * does it have a category
     *
     * @param value
     * @param metaData
     * @param record
     * @returns string
     */
    infoColumnRenderer: function (value, metaData, record) {
        var me = this,
                result = '',
                title;

        var style = 'style="width: 25px; height: 25px; display: inline-block; margin-right: 3px;"';

        if (!record.get('imageSrc')) {
            title = '{s name=list/tooltip_noimage}Article has no image{/s}';
            result = result + '<div  title="' + title + '" class="sprite-image--exclamation" ' + style + '>&nbsp;</div>';
        }

        if (record.get('hasConfigurator')) {
            title = '{s name=list/tooltip_hasconfigurator}Article has configurator{/s}';
            result = result + '<div  title="' + title + '" class="sprite-images-stack" ' + style + '>&nbsp;</div>';
        }

        if (!record.get('hasCategories')) {
            title = '{s name=list/tooltip_categories}Article is not assigned to any category{/s}';
            result = result + '<div title="' + title + '" class="sprite-blue-folder--exclamation" ' + style + '>&nbsp;</div>';
        }

        return result;
    },

    /**
     * Will return a renderer depending on the passed column.
     * todo: Article_name should not be hardcoded here
     *
     * @param column
     * @returns string|function
     */
    getRendererForColumn: function (column) {
        var me = this;

        if (column.alias === 'Article_name') {
            return me.boldColumnRenderer;
        }

        if (column.type === 'boolean') {
            return me.booleanColumnRenderer;
        }

        if (column.alias === 'Detail_inStock') {
            return me.colorColumnRenderer;
        }

        if (column.alias === 'Price_price') {
            return undefined;
        }

        return me.defaultColumnRenderer;
    },

    /**
     * Will return a green string for values > 0 and red otherwise
     *
     * @param value
     * @returns string
     */
    colorColumnRenderer: function (value) {
        value = value || 0;
        if (value > 0) {
            return '<span style="color:green;">' + value + '</span>';
        } else {
            return '<span style="color:red;">' + value + '</span>';
        }
    },

    /**
     * Helper method which returns a "human readable" translation for a columnAlias
     * Will return the columnAlias, if no translation was created
     *
     * @param columnHeader
     * @returns string
     */
    getTranslationForColumnHead: function (columnHeader) {
        var me = this;

        if (me.snippets.hasOwnProperty(columnHeader)) {
            return me.snippets[columnHeader];
        }
        return columnHeader;
    },

    /**
     * Return width for a given column
     *
     * For known fields like boolean, integer, date and datetime, we can try and
     * educated guess, for anything else undefined is returned.
     *
     * @param column
     */
    getWidthForColumn: function (column) {
        var me = this;

        if (column.alias.slice(-2).toLowerCase() === 'id') {
            return 60;
        }

        switch (column.alias) {
            case 'Price_price':
                return 90;
            case 'Detail_number':
                return 110;
            case 'Supplier_name':
                return 110;
            case 'Article_active':
            case 'Detail_active':
                return 40;
            case 'Tax_name':
                return 75;
            case 'Detail_inStock':
                return 80;
        }

        switch (column.type) {
            case 'integer':
            case 'decimal':
            case 'float':
                return 60;
            case 'string':
            case 'text':
                return undefined;
            case 'boolean':
                return 60;
            case 'date':
                return 100;
            case 'datetime':
                return 140;
            default:
                return undefined;
        }
    },

    /**
     * Helper method which returns a rowEditing.editor for a given column.
     *
     * @param column
     * @returns Object|boolean
     */
    getEditorForColumn: function (column) {
        var me = this;

        // Do create editor for columns, which have been configured to be non-editable
        if (!column.editable) {
            return false;
        }

        switch (column.alias) {
            case 'Price_price':
                return {
                    width: 85,
                    xtype: 'numberfield',
                    allowBlank: false,
                    hideTrigger: true,
                    keyNavEnabled: false,
                    mouseWheelEnabled: false
                };
            default:
                switch (column.type) {
                    case 'integer':
                    case 'decimal':
                    case 'float':
                        var precision = 0;
                        if (column.precision) {
                            precision = column.precision
                        } else if (column.type === 'float') {
                            precision = 3;
                        } else if (column.type === 'decimal') {
                            precision = 3;
                        }
                        return { xtype: 'numberfield', decimalPrecision: precision };
                        break;

                    case 'string':
                    case 'text':
                        return 'textfield';
                        break;

                    case 'boolean':
                        return {
                            xtype: 'checkbox',
                            inputValue: 1,
                            uncheckedValue: 0
                        };
                        break;

                    case 'date':
                        return new Ext.form.DateField({
                            disabled: false,
                            format: 'Y-m-d'
                        });
                        break;

                    case 'datetime':
                        return new Ext.form.DateField({
                            disabled: false,
                            format: 'Y-m-d H:i:s'
                        });

                        return new Shopware.apps.Base.view.element.DateTime({
                            timeCfg: { format: 'H:i:s' },
                            dateCfg: { format: 'Y-m-d' }
                        });
                        break;

                    default:
                        break;
                }
                break;
        }
    },


    /**
     * Creates the grid toolbar
     *
     * @return [Ext.toolbar.Toolbar] grid toolbar
     */
    getToolbar: function () {
        var me = this, buttons = [];

        me.splitViewModeBtn = Ext.create('Ext.button.Button', {
            iconCls: 'sprite-ui-split-panel',
            text: '{s name=enableSplitView}Activate split view{/s}',
            disabled: true,
            enableToggle: true,
            handler: function () {
                var selectionModel = me.getSelectionModel(),
                        record = selectionModel.getSelection()[0];

                me.fireEvent('triggerSplitView', this, record);
            }
        });

        buttons.push(me.splitViewModeBtn);

        /*{if {acl_is_allowed resource=article privilege=save}}*/
        buttons.push(
                Ext.create('Ext.button.Button', {
                    text: '{s name=addProduct}Add{/s}',
                    iconCls: 'sprite-plus-circle-frame',
                    handler: function () {
                        Shopware.app.Application.addSubApplication({
                            name: 'Shopware.apps.Article',
                            action: 'detail'
                        });
                    }
                })
        );
        /*{/if}*/

        // Creates the delete button to remove all selected esds in one request.
        me.deleteButton = Ext.create('Ext.button.Button', {
            iconCls: 'sprite-minus-circle-frame',
            text: '{s name=deleteProduct}Delete{/s}',
            disabled: true,
            handler: function () {
                var selectionModel = me.getSelectionModel(),
                        records = selectionModel.getSelection();

                if (records.length > 0) {
                    me.fireEvent('deleteMultipleProducts', records);
                }
            }
        });

        /*{if {acl_is_allowed resource=article privilege=delete}}*/
        buttons.push(me.deleteButton);
        /*{/if}*/

        me.customButton = Ext.create('Ext.button.Button', {
            iconCls: 'sprite-minus-circle-frame',
            text: 'Custom',
            //disabled: true,
            handler: function () {
                console.log('09090909');
                var selectionModel = me.getSelectionModel(),
                        records = selectionModel.getSelection();
                me.createSidebar();
                /*if (records.length > 0) {
                    me.fireEvent('deleteMultipleProducts', records);
                }*/
            }
        });

        buttons.push(me.customButton);


        buttons.push('->');

        buttons.push({
            xtype: 'textfield',
            name: 'searchfield',
            action: 'search',
            width: 170,
            cls: 'searchfield',
            enableKeyEvents: true,
            checkChangeBuffer: 500,
            emptyText: '{s name=list/emptytext_search}Search ...{/s}',
            listeners: {
                'change': function (field, value) {
                    var store = me.store,
                            searchString = Ext.String.trim(value);

                    me.fireEvent('search', searchString);
                }
            }
        });

        return Ext.create('Ext.toolbar.Toolbar', {
            ui: 'shopware-ui',
            items: buttons
        });
    },


    createSidebar: function() {
        console.log('555555555555555555555555555');
        
        Ext.create('Shopware.apps.ArticleList.view.main.Grid', {
   
}).show();
    },

    /**
     * Creates pagingbar
     *
     * @return Ext.toolbar.Paging
     */
    getPagingbar: function () {
        var me = this,
                productSnippet = '{s name=pagingCombo/products}products{/s}';

        var pageSize = Ext.create('Ext.form.field.ComboBox', {
            labelWidth: 120,
            cls: Ext.baseCSSPrefix + 'page-size',
            queryMode: 'local',
            width: 180,
            editable: false,
            listeners: {
                scope: me,
                select: me.onPageSizeChange
            },
            store: Ext.create('Ext.data.Store', {
                fields: [ 'value', 'name' ],
                data: [
                    { value: '25', name: '25 ' + productSnippet },
                    { value: '50', name: '50 ' + productSnippet },
                    { value: '75', name: '75 ' + productSnippet },
                    { value: '100', name: '100 ' + productSnippet },
                    { value: '125', name: '125 ' + productSnippet },
                    { value: '150', name: '150 ' + productSnippet }
                ]
            }),
            displayField: 'name',
            valueField: 'value'
        });

        var pagingBar = Ext.create('Ext.toolbar.Paging', {
            dock: 'bottom',
            displayInfo: true
        });

        pagingBar.insert(pagingBar.items.length, [
            { xtype: 'tbspacer', width: 6 },
            pageSize
        ]);

        return pagingBar;
    },

    /**
     * Event listener method which fires when the user selects
     * a entry in the "number of orders"-combo box.
     *
     * @event select
     * @param { object } combo - Ext.form.field.ComboBox
     * @param { array } records - Array of selected entries
     * @return void
     */
    onPageSizeChange: function (combo, records) {
        var record = records[0],
                me = this;

        me.store.pageSize = record.get('value');
        if (!me.store.getProxy().extraParams.ast) {
            return;
        }

        me.store.loadPage(1);
    }
});
//{/block}
