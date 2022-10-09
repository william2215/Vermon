const express = require("express");
const router = express.Router();
const startCreating = require("../src/logic/nft");
const bcrypt = require("bcrypt");

const {
    models: {
        Usuario,
        Empresa,
        SolicitudEmpresa,
        SolicitudNFT,
        TipoNFT,
        TipoEmpresa,
        Nft,
        Evidencias,
        EmpresaSolicitudNFT
    },
} = require("../database/db");


router.get("/generador", async (req, res) => {
    var NFT = await startCreating();
    res.send({ imagenes: NFT.dat, jsonContract: NFT.textPadre });
});

router.post("/solicitudEmpresa", async (req, res, next) => {
    try
    {
        var solicitudEmpresa = await SolicitudEmpresa.create({
            nombre: req.body.nombre,
            longitud: req.body.longitud,
            latitud: req.body.latitud,
            numeroTelefono: req.body.numeroTelefono,
            fechaSolicitud: req.body.fechaSolicitud,
            estaAprobado: 0,
            idTipoEmpresa: req.body.idTipoEmpresa,
        });
        res.status(200).json({ 'success': true, 'solicitudEmpresa': solicitudEmpresa })
    } catch (err)
    {
        res.status(500).send({ 'success': false, 'error': err });
    }

    next();
});

router.post("/empresa/:id", async (req, res, next) => {
    try
    {
        var sol = await SolicitudEmpresa.findOne({ where: { id: req.params.id } });
        sol.set({
            estaAprobado: req.body.estaAprobado
        })
        await sol.save()
        var empresa = await Empresa.create({
            idSolicitudEmpresa: sol.id
        })
        const salt = await bcrypt.genSalt(10);

        var usuario = await Usuario.create({
            nombre: req.body.nombre,
            correo: req.body.correo,
            password: await bcrypt.hash('password', salt),
            esAdminEmpresa: false,
            idEmpresa: empresa.id

        });

        res.status(200).json({ 'success': true, 'empresa': empresa, "usuario": usuario })
    } catch (err)
    {
        res.status(500).send({ 'success': false, 'error': err });
    }

    next();
});

router.post("/NFT/:id", async (req, res, next) => {
    try
    {
        var evi = await Evidencias.findOne({ where: { id: req.params.id } });
        evi.set({
            estaAprobado: req.body.estaAprobado
        })
        await evi.save()

        var creacion = startCreating()

        if (req.body.estaAprobado)
        {
            await Nft.create({
                metadatos: JSON.stringify({ "imagen": (await creacion).dat, "token": (await creacion).textPadre }),
                idEvidencia: evi.id
            });

            res.status(200).json({ 'success': true, 'NFT': (await creacion).dat })

        }
        res.status(200).json({ 'success': true, 'NFT': "rechazado" })

    } catch (err)
    {
        res.status(500).send({ 'success': false, 'error': err });
    }

    next();
});

router.post("/solicitudNFT", async (req, res, next) => {
    try
    {
        var solicitudNFT = await SolicitudNFT.create({
            pdf: req.body.pdf,
            idTipoNFT: req.body.idTipoNFT,

        });
        res.status(200).json({ 'success': true, 'NFT': solicitudNFT })
    } catch (err)
    {
        console.log(err)
        res.status(500).send({ 'success': false, 'error': err });
    }

    next();
});

router.post("/empresaSolicitudNFT", async (req, res, next) => {
    try
    {
        var empresa = await Empresa.findOne({ where: { id: req.body.idEmpresa } });
        var solicitudNFT = await SolicitudNFT.findOne({ where: { id: req.body.idSolicitudNFT } });

        var empresaSolicitudNFT = await EmpresaSolicitudNFT.create({
            estaAprobado: req.body.estaAprobado,
            idEmpresa: empresa.id,
            idEmpresaSolicitud: solicitudNFT.id

        });
        res.status(200).json({ 'success': true, 'EmpresaSolicitudNFT': empresaSolicitudNFT })
    } catch (err)
    {
        res.status(500).send({ 'success': false, 'error': err });
    }

    next();
});

router.post("/evidencia", async (req, res, next) => {
    try
    {
        var empresaSolicitudNFT = await EmpresaSolicitudNFT.findOne({ where: { id: req.body.idEmpresaSolicitudNFT } });

        var evidencias = await Evidencias.create({
            imagen: req.body.imagen,
            video: req.body.video,
            pdf: req.body.pdf,
            idEmpresaSolicitudNFT: empresaSolicitudNFT.id,
            estaAprobado: 0
        });
        res.status(200).json({ 'success': true, 'evidencia': evidencias })
    } catch (err)
    {
        res.status(500).send({ 'success': false, 'error': err });
    }

    next();
});

router.post("/cambioDePassword", async (req, res, next) => {
    try
    {
        var usuario = await Usuario.findOne({ where: { correo: req.body.correo } });
        const salt = await bcrypt.genSalt(10);
        await usuario.set({
            password: await bcrypt.hash(usuario.password, salt),
        });
        await usuario.save()
        res.status(200).json({ 'success': true, 'Usuario': "password cambiado" })
    } catch (err)
    {
        console.error(err)
        res.status(500).send({ 'success': false, 'error': err });
    }
    next();
});

router.post("/login", async (req, res, next) => {
    try
    {
        var usuario = await Usuario.findOne({ where: { correo: req.body.correo } });
        const validPassword = await bcrypt.compare(req.body.password, usuario.password);
        if (validPassword)
        {
            res.status(200).json({ 'success': true, 'Usuario': usuario })
        } else
        {
            throw "User not found"
        }
    } catch (err)
    {
        res.status(500).send({ 'success': false, 'error': err });
    }
    next();
});

router.get("/obtenerSolicitudesEmpresaPendientes", async (req, res, next) => {
    try
    {
        var solicitudesEmpresaPendientes = await SolicitudEmpresa.findAll({ where: { estaAprobado: false } });
        res.status(200).json({ 'success': true, 'solicitudEmpresaPendientes': solicitudesEmpresaPendientes })
    } catch (err)
    {
        res.status(500).send({ 'success': false, 'error': err });
    }
    next();
});

router.get("/obtenerSolicitudesEmpresaNFTPendientes", async (req, res, next) => {
    try
    {
        var solicitudesEmpresaPendientes = await EmpresaSolicitudNFT.findAll({ where: { estaAprobado: false } });
        res.status(200).json({ 'success': true, 'solicitudEmpresaNFTPendientes': solicitudesEmpresaPendientes })
    } catch (err)
    {
        res.status(500).send({ 'success': false, 'error': err });
    }
    next();
});

router.get("/obtenerSolicitudesEvidenciasPendientes", async (req, res, next) => {
    try
    {
        var solicitudesEmpresaPendientes = await Evidencias.findAll({ where: { estaAprobado: false } });
        res.status(200).json({ 'success': true, 'evidenciasPendientes': solicitudesEmpresaPendientes })
    } catch (err)
    {
        res.status(500).send({ 'success': false, 'error': err });
    }
    next();
});

module.exports = router;
