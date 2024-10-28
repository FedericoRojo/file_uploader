const {Router} = require("express");
const userController = require("../controllers/userController");
const { isAuth } = require("./authMiddleware");

const userRouter = Router();

userRouter.get('/register', userController.getRegisterUser);
userRouter.post('/register', userController.registerUser);

userRouter.get('/login', userController.getLoginUser);
userRouter.post('/login', userController.loginUser);

userRouter.post('/logout', isAuth,userController.logoutUser);

userRouter.get('/folders', isAuth, userController.getCreateFolder);
userRouter.post('/createFolder', isAuth, userController.createFolder);
userRouter.post('/deleteFolder', isAuth, userController.deleteFolder);

userRouter.get('/folder/:id', isAuth, userController.getFilesFromFolder);
userRouter.post('/uploadFile', isAuth, userController.upload.single('file'), userController.uploadFile);
userRouter.get('/downloadFile', isAuth, userController.downloadFile);
userRouter.get('/downloadFileShared', userController.downloadFileShared);
userRouter.post('/deleteFile', isAuth, userController.deleteFile);

userRouter.post('/updateFolder', isAuth, userController.updateFolder);

userRouter.get('/shareFolder',isAuth , userController.generateShareLink);
userRouter.get('/shared-folder/:id', userController.getShareFolder);


userRouter.get('/', userController.getHome);


module.exports = userRouter;