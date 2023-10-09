import fs from "fs";
import express from "express";
import {BASE_IMG_URL, BASE_MEI_URL, db, ngr_len, SERVER_BASE_ROUTE} from "../server.js";
import path from "path";
import {get_codestring} from "../services/search.js";


const router = express.Router();
export default router;


router.get('/', function (req, res) {
    const data = {cache: false, base_route: SERVER_BASE_ROUTE}
    res.render('index', data);
});

