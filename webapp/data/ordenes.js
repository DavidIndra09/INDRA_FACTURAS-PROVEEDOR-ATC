sap.ui.define([
	"sap/ui/base/ManagedObject"
], function(
	ManagedObject
) {
	"use strict";

	return ManagedObject.extend("usil.com.listapprovals.data.ordenes", {
        /**
         * @override
         * @param {any} [sId] 
         * @param {any} [mSettings] 
         * @param {any} [oScope] 
         * @returns {sap.ui.base.ManagedObject}
         */
        constructor: function(sId, mSettings, oScope) {
        },

        getOrdenes: function () {
            return [
                {
                    "conformidad": "5000000001",
                    "posicionConformidad": "10",
                    "ordenCompra":"4500000101",
                    "posicionOrden": "5",
                    "Bedat": "23-10-2022",
                    "TipoD": "B",
                    "codigoMaterial": "50065045",
                    "descripcionMaterial": "LAPTOP CLEANTECH",
                    "cantidad": "2",
                    "unidadMedida": "UN",
                    "unidadEnvio": "ST",
                    "importe": "1239.45",
                    "moneda": "PEN",
                    "Bukrs": "CDBS"
                },
                {
                    "conformidad": "5000000002",
                    "posicionConformidad": "40",
                    "ordenCompra":"4500000101",
                    "posicionOrden": "3",
                    "Bedat": "17-11-2022",
                    "TipoD": "B",
                    "codigoMaterial": "50065075",
                    "descripcionMaterial": "EJE (CON INTEGRACIÓN QM)",
                    "cantidad": "6",
                    "unidadMedida": "UN",
                    "unidadEnvio": "ST",
                    "importe": "345.05",
                    "moneda": "PEN",
                    "Bukrs": "CDBS"
                },
                {
                    "conformidad": "5000000003",
                    "posicionConformidad": "20",
                    "ordenCompra":"4500000101",
                    "posicionOrden": "11",
                    "Bedat": "15-12-2022",
                    "TipoD": "S",
                    "codigoMaterial": "50065385",
                    "descripcionMaterial": "CALCULADORA DE EMISIONES ECOLÓGICAS",
                    "cantidad": "5",
                    "unidadMedida": "UN",
                    "unidadEnvio": "ST",
                    "importe": "5452.62",
                    "moneda": "PEN",
                    "Bukrs": "CDBS"
                },
                {
                    "conformidad": "5000000004",
                    "posicionConformidad": "60",
                    "ordenCompra":"4500000102",
                    "posicionOrden": "17",
                    "Bedat": "23-09-2022",
                    "TipoD": "B",
                    "codigoMaterial": "50065556",
                    "descripcionMaterial": "SERVICIOS DE CONSULTORIA",
                    "cantidad": "3",
                    "unidadMedida": "UN",
                    "unidadEnvio": "ST",
                    "importe": "12923.99",
                    "moneda": "PEN",
                    "Bukrs": "CDBS"
                },
                {
                    "conformidad": "5000000005",
                    "posicionConformidad": "300",
                    "ordenCompra":"4500000102",
                    "posicionOrden": "12",
                    "Bedat": "05-12-2022",
                    "TipoD": "S",
                    "codigoMaterial": "50065585",
                    "descripcionMaterial": "SERVICIOS DE CONSULTORÍA SAP",
                    "cantidad": "15",
                    "unidadMedida": "UN",
                    "unidadEnvio": "ST",
                    "importe": "423.01",
                    "moneda": "PEN",
                    "Bukrs": "CDBS"
                },
                {
                    "conformidad": "5000000006",
                    "posicionConformidad": "300",
                    "ordenCompra":"4500000102",
                    "posicionOrden": "15",
                    "Bedat": "21-03-2023",
                    "TipoD": "S",
                    "codigoMaterial": "50065615",
                    "descripcionMaterial": "LAPTOP",
                    "cantidad": "4",
                    "unidadMedida": "UN",
                    "unidadEnvio": "ST",
                    "importe": "2078.75",
                    "moneda": "PEN",
                    "Bukrs": "CDBS"
                },
                {
                    "conformidad": "5000000007",
                    "posicionConformidad": "300",
                    "ordenCompra":"4500000102",
                    "posicionOrden": "19",
                    "Bedat": "07-02-2023",
                    "TipoD": "S",
                    "codigoMaterial": "50065635",
                    "descripcionMaterial": "MATERIA PRIMA",
                    "cantidad": "5",
                    "unidadMedida": "UN",
                    "unidadEnvio": "ST",
                    "importe": "1500.00",
                    "moneda": "PEN",
                    "Bukrs": "CDBS"
                }
            ]
        },

        getTipo: function () {
            return [
                {
                    id: "B",
                    descripcion: "Bienes"
                },
                {
                    id: "S",
                    descripcion: "Servicios"
                }
            ]
        },

        getFacturas: function (){
            return [
                {
                    codigoSolicitud: "1000000001",
                    codigoFactura:"F01-0000001",
                    codigoProveedor:"P005",
                    ordenCompra:"00034345",
                    fechaCreacion:"08-03-2023",
                    fechaEmision:"08-03-2023",
                    importe:"1234.56",
                    estadoFactura: 1
                },
                {
                    codigoSolicitud: "1000000002",
                    codigoFactura:"F01-0000002",
                    codigoProveedor:"P002",
                    ordenCompra:"00034345",
                    fechaCreacion:"08-03-2023",
                    fechaEmision:"08-03-2023",
                    importe:"346.78",
                    estadoFactura: 1
                },
                {
                    codigoSolicitud: "1000000003",
                    codigoFactura:"F01-0000003",
                    codigoProveedor:"P001",
                    fechaCreacion:"08-03-2023",
                    fechaEmision:"08-03-2023",
                    ordenCompra:"00034345",
                    importe:"1234.56",
                    estadoFactura: 3
                },
                {
                    codigoSolicitud: "1000000004",
                    codigoFactura:"F01-0000004",
                    codigoProveedor:"P004",
                    ordenCompra:"00047345",
                    fechaCreacion:"08-03-2023",
                    fechaEmision:"08-03-2023",
                    importe:"840",
                    estadoFactura: 4,
                },
                {
                    codigoSolicitud: "1000000005",
                    codigoFactura:"F01-0000005",
                    codigoProveedor:"P003",
                    ordenCompra:"00098345",
                    fechaCreacion:"08-03-2023",
                    fechaEmision:"08-03-2023",
                    importe:"355.41",
                    estadoFactura: 5
                },
                {
                    codigoSolicitud: "1000000006",
                    codigoFactura:"F01-0000006",
                    codigoProveedor:"P006",
                    ordenCompra:"00045454",
                    fechaCreacion:"08-03-2023",
                    fechaEmision:"08-03-2023",
                    importe:"7120.56",
                    estadoFactura: 2
                },
                {
                    codigoSolicitud: "1000000007",
                    codigoFactura:"F01-0000007",
                    codigoProveedor:"P006",
                    ordenCompra:"00045454",
                    fechaCreacion:"08-03-2023",
                    fechaEmision:"08-03-2023",
                    importe:"1598.02",
                    estadoFactura: 6
                },
                {
                    codigoSolicitud: "1000000008",
                    codigoFactura:"F01-0000008",
                    codigoProveedor:"P006",
                    ordenCompra:"00045454",
                    fechaCreacion:"08-03-2023",
                    fechaEmision:"08-03-2023",
                    importe:"398.00",
                    estadoFactura: 5,
                    stateFactura: "Success"
                },
                {
                    codigoSolicitud: "1000000009",
                    codigoFactura:"F01-0000009",
                    codigoProveedor:"P006",
                    ordenCompra:"00045454",
                    fechaCreacion:"08-03-2023",
                    fechaEmision:"08-03-2023",
                    importe:"267.41",
                    estadoFactura: 3
                }
            ]
        },

        getEstadosFactura: function ( ){
            return [
                { ID: "CR", description: "Confirmado", icon: "sap-icon://create"},
                { ID: "EN", description: "En Espera", icon: "sap-icon://paper-plane"},
                { ID: "PR", description: "Procesado", icon: "sap-icon://in-progress"},
                { ID: "PA", description: "Pagado", icon: "sap-icon://paid-leave"},
                { ID: "OB", description: "Observado", icon: "sap-icon://decline"}
            ]
        }


	});
});