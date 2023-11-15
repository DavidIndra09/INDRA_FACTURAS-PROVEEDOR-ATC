sap.ui.define([
	"sap/ui/base/ManagedObject",
    "../data/ordenes"
], function(
	ManagedObject,
    Ordenes
) {
	"use strict";

    let instance;
    let services =  ManagedObject.extend("usil.com.listapprovals.services.service", {
        constructor: function(){
            this.ordenCompra = {};
            this.tipo = {};
            this.factura = {};
            this.estadoFactura = {};
        },
        newOrdenCompra: function(){
            this.ordenCompra = new Ordenes();
            return this.ordenCompra.getOrdenes();
        },

        newTipo : function (){
            this.tipo = new Ordenes();
            return this.ordenCompra.getTipo();
        },
        newFactura : function (){
            this.factura = new Ordenes();
            return this.ordenCompra.getFacturas();
        },
        newEstadofactura: function(){
            this.estadoFactura = new Ordenes();
            return this.estadoFactura.getEstadosFactura();
        }
	});

    return {
        getInstance: function () {
            if (!instance) {
                instance = new services();
            }
            return instance;
        }
    }
});