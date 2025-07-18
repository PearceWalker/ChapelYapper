import { Dialog, Transition } from "@headlessui/react";
import { useConnection } from "context/connect";
import { useRouter } from "next/router";
import { Fragment, useEffect, useState } from "react";
import { faCheckCircle, faComment, faLock, faPlus, faHeartbeat, faRandom, faRightToBracket, faShuffle, faUser, faUserSecret, faBug, faLightbulb, faSignOut } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { motion, AnimatePresence } from "framer-motion"
import { mainConfig } from "config/config";
import { signOut } from "next-auth/react";


export default function Sidebar() {
    
    const router = useRouter();
    let [rooms, setRooms] = useState([]);
    let [user, setUser] = useState(null);
    let [isOpen, setIsOpen] = useState(false);
    let [protectedRoom, setProtected] = useState(false);
    let [password, setPassword] = useState('');
    const { connection } = useConnection();
    let [onroom, setOnroom] = useState(false);
    let [online, setOnline] = useState(0);
    const { pathname } = useRouter();
    const [chapelTime, setChapelTime] = useState(false);

/*     Chapel */

    useEffect(() => {
        const checkChapelTime = () => {
        const now = new Date();
        const isChapel =
            now.getDay() >= 1 && now.getDay() <= 5 && // Monday–Friday
            now.getHours() === 10 &&
            now.getMinutes() >= 30 &&
            now.getMinutes() <= 59;
  
        setChapelTime(isChapel);
    };
  
        checkChapelTime();
        const interval = setInterval(checkChapelTime, 60000); 
  
        return () => clearInterval(interval);
        }, []);

/* rooms */

    useEffect(() => {
        if (connection) {
            connection.emit('fetchUser');
            connection.on('user', data => {
                if (data === null) {
                    router.push('/');
                } else {
                    setUser(data);
                }
            });

            return () => {
                connection.off('user', data => {
                    if (data === null) {
                        router.push('/');
                    } else {
                        setUser(data);
                    }
                });
            }
        }
    }, [connection]);

    useEffect(() => {
        if (connection) {
            connection.emit('fetchRooms');
            connection.on('rooms', data => {
                setRooms(data.rooms.slice(-10));
            });
            
            return () => {
                connection.off('rooms', data => {
                    if (data.isLogged) {
                        setUser(data.user);
                    }
                    setRooms(data.rooms.slice(-10));
                });
            }
        }
    }, []);

    function getRandomInt(max) {
        if(rooms.length == 1){
            max = 0
        }
        return Math.floor(Math.random() * max);
      }


    const filterroomsrandom2 = rooms.filter(arr => arr.name == 'random')
    const filterroomsrandom = filterroomsrandom2.filter(arr => arr.users < 2)
    const filterrooms2 = rooms.filter(arr => !arr.passwordProtected)
    const filterrooms = filterrooms2.filter(arr => arr.name != "random")

    async function joinrandom(){
        if (filterrooms.length >= 1){
            const randomroom = getRandomInt(filterrooms.length)
            JoinRoom(rooms[randomroom])
            router.push(`/rooms/${rooms[randomroom].id}`)
        }
    }

    async function chatrandom(){

        if(pathname != "/rooms"){
            await LeaveRoom()
        }

      
        
        if (filterroomsrandom.length >= 1){
            const randomroom = getRandomInt(filterroomsrandom.length)
            router.push(`/random/${rooms[randomroom].id}`)
        }else{
            CreateRoom()
        }
    }


function CreateRoom(){
    const name = "random";
    const password = "";
    const maxUsers = 2;

    connection.emit('createRoom', { name, password, maxUsers });
    connection.on('createRoom', data => {
        const result = data;
        if (result.success) {
            router.push(`/random/` + result.data.id)
        } else {
            
        }
    });
}
    

    useEffect(() => {
        if(router.pathname == "/rooms"){
            setOnroom(false) 
        }else{
            setOnroom(true)
        }

        connection?.off('UsersOnline').on('UsersOnline', data => {
            if (data.success) {
                setOnline(data.users);
            } else {
            }
        });
    }, [router]);

    const LeaveRoom = async () => {
        connection.emit('leaveRoom');
        connection.on('leaveRoom', data => {
            if (data.success) {
               
            }
            
        });
    }

    const JoinRoom = room => {
        const { id, passwordProtected } = room;
        if (passwordProtected) {
            setIsOpen(true);
            setProtected(room);

            if (password) {
                connection.emit('joinRoom', { id, password });
            }

        } else {
            connection.emit('joinRoom', { id });
        }

        connection.off('joinRoom').on('joinRoom', data => {
            if (data.success) {
                setIsOpen(false);
                setPassword('');
                router.push('/rooms/' + id);
            } else {
                if (data?.alreadyIn) {
                    router.push('/rooms/' + id);
                } else {
                    alert(data.error)
                }
            }
        });
    }

    return <>
        {router.pathname != "/random" && <motion.div
    initial={{opacity: 0}}
  animate={{ opacity: 1 }}
  transition={{ duration: 0, type: "tween" }}
>
        <Transition appear show={isOpen} as={Fragment}>

            <Dialog as="div" className="relative z-10" onClose={() => {
                setIsOpen(false);
                setPassword('');
            }}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black bg-opacity-50" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                                <Dialog.Panel className={`w-full max-w-md transform overflow-hidden rounded-2xl p-6 text-left align-middle shadow-xl transition-all ${
                                chapelTime ? "bg-[#661424] text-white" : "bg-[var(--sidebar-color)] text-white"
                                }`}>
                                <Dialog.Title
                                    as="h3"
                                    className="text-lg font-medium leading-6 text-white"
                                >
                                    Password Protected Room
                                </Dialog.Title>
                                <form onSubmit={(e) => {
                                    e.preventDefault();
                                    JoinRoom(protectedRoom);
                                }}>
                                    <div className="mt-2">
                                        <p className="text-sm text-gray-300">
                                            This room is password protected. Please enter the password to join.
                                        </p>

                                        <input
                                        type="password"
                                        className={`w-full mt-2 p-2 rounded-md text-white outline-none border border-white/5 focus:border-gray-500 transition-all duration-200 ${
                                        chapelTime ? "bg-[#661424]" : "bg-[var(--sidebar-color)]"
                                        }`}
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        />

                                    </div>

                                    <div className="mt-4">
                                        <button
                                            
                                            type="submit"
                                            className="transition-all duration-200 inline-flex justify-center w-full rounded-md border border-transparent shadow-sm px-4 py-2 bg-gray-500 text-base font-medium text-white hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 sm:text-sm"
                                        >
                                            Join
                                        </button>
                                    </div>
                                </form>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>

        <div className={`sticky top-0 md:h-screen md:w-96 text-white p-6 md:flex md:flex-col md:justify-between hidden ${
        chapelTime ? "bg-[#661424]" : "bg-[var(--sidebar-color)]"
        }`}>
        <div className="flex flex-col items-center space-y-3">
        {chapelTime ? (
  <div className="flex flex-col items-center">
    <img src="/assets/ChapelLogo.png" alt="Chapel Logo" className="w-24" />
    <h1 className="text-3xl font-extrabold text-white-800"> Chapel Time! </h1>
  </div>
) : (
  <>
    <img src="/assets/BetterLogoTiny.png" alt="Logo" className="mx-auto w-20 " />
    <h1 className="mx-auto text-3xl font-bold p-4 ">ChapYapper</h1>
  </>
)}

            
                
                <button onClick={() => router.push('/rooms/create')} className="m-2 w-full rounded-md px-4 py-2  text-white-300 bg-gradient-to-r from-cyan-500 to-blue-500 hover:bg-gradient-to-bl focus:outline-none focus:ring-2 focus:ring-gray-700 focus:ring-opacity-50 transition-all duration-200 flex flex-row items-center justify-center ">Create Group Chat<FontAwesomeIcon className=" h-3 mx-2" icon={faPlus} /> </button>
            
                 <button onClick={() => chatrandom()} className="m-2 w-full rounded-md px-4 py-2  text-white-300 bg-gradient-to-r from-cyan-500 to-blue-500 hover:bg-gradient-to-bl focus:outline-none focus:ring-2 focus:ring-gray-700 focus:ring-opacity-50 transition-all duration-200 flex flex-row items-center justify-center">Chat with stranger<FontAwesomeIcon className=" h-3 mx-2" icon={faUserSecret} /></button>
                 <button onClick={() => router.push('/pulse')} className="m-2 w-full rounded-md px-4 py-2  text-white-300 bg-gradient-to-r from-cyan-500 to-blue-500 hover:bg-gradient-to-bl focus:outline-none focus:ring-2 focus:ring-gray-700 focus:ring-opacity-50 transition-all duration-200 flex flex-row items-center justify-center">Pulse (beta)<FontAwesomeIcon className=" h-3 mx-2" icon={faHeartbeat} /></button>


            </div>
            <div className="flex flex-col h-full mt-4 space-y-2">
                {rooms.map(room => {
                    return <div>
                        {room.name != "random" && <div key={room.id} className="flex flex-row items-center gap-2 p-2 pr-4 rounded-md hover:bg-zinc-500/5 transition-all duration-200 cursor-pointer" onClick={() => JoinRoom(room)}>
                        <img src={`${ mainConfig.initialsAPI + room?.name || mainConfig.initialsAPI + "NoName"}.png`} alt="username" className="w-10 h-10 rounded-md" />
                        <div className="flex-shrink-0 flex flex-col">
                            <span className="font-semibold">{room.name}</span>
                            {!room?.owner?.verified ? <span className="text-xs text-gray-400">Created by {room?.owner?.username.split(0, 5) + '...'}</span> : <span className="text-xs text-gray-400 flex flex-row items-center">Created by {room?.owner?.username.split(0, 5)} <FontAwesomeIcon className=" h-3 mx-2" icon={faCheckCircle} /></span> }
                        </div>
                        <div className="flex flex-row justify-end w-full items-center space-x-1">
                            {room.passwordProtected && <FontAwesomeIcon className=" h-3 mx-2" icon={faLock} />}
                            <span className="text-xs text-gray-400 bg-[#18191b] rounded-md p-1">{room.users || 0}/{room.maxUsers}</span>
                        </div>
                    </div>}
                    </div>
                })}
            </div>

            <div className="flex flex-row items-center space-y-3 mt-6 w-full">
                <div className="flex flex-row items-center space-x-2 w-full hover:bg-zinc-500/5 p-4 rounded-lg transition-all duration-200">
                    {!user?.verified ? <span className="font-semibold">{user?.username}</span> : <span className="font-semibold flex -flex-row items-center">{user?.username} <FontAwesomeIcon className=" h-3 mx-2" icon={faCheckCircle} /></span> }
                </div>
                <div className="flex flex-row space-x-4 justify-center w-full mt-2 text-white">
                <a
                    href="/bug-report"
                    title="Report a bug"
                    className="hover:text-red-400 transition-colors duration-200"
                >
                    <FontAwesomeIcon icon={faBug} className="h-5 w-5 mr-5" />
                </a>
                <a
                    href="/suggest-feature"
                    title="Suggest a feature"
                    className="hover:text-yellow-300 transition-colors duration-200"
                >
                    <FontAwesomeIcon icon={faLightbulb} className="h-5 w-5 mr-5" />
                </a>
                <button
                onClick={() => signOut()}
                title="Log out"
                className="text-white hover:text-red-500 transition-colors duration-200"
                >
    <FontAwesomeIcon icon={faSignOut} className="h-5 w-5" />
  </button>

</div>

            </div>
            
        </div>

        {!onroom && 
        <div className={`absolute t-0 h-screen w-full text-white p-6 md:hidden flex-col justify-between flex ${
        chapelTime ? "bg-[#661424]" : "bg-[var(--sidebar-color)]"
         }`}>
        <div className="flex flex-col items-center space-y-3">
        {chapelTime ? (
  <div className="flex flex-col items-center">
    <img src="/assets/ChapelLogo.png" alt="Chapel Logo" className="w-32" />
    <h1 className="text-3xl font-extrabold text-white-800"> Chapel Time! </h1>
  </div>
) : (
  <>
    <img src="/assets/BetterLogoTiny.png" alt="Logo" className="mx-auto w-20 " />
    <h1 className="mx-auto text-3xl font-bold p-4 ">ChapYapper</h1>
  </>
)}

            
                <button onClick={() => router.push('/rooms/create')} className="w-full rounded-md px-4 py-4  text-white-300 bg-gradient-to-r from-cyan-500 to-blue-500 hover:bg-gradient-to-bl focus:outline-none focus:ring-2 focus:ring-gray-700 focus:ring-opacity-50 transition-all duration-200 flex flex-row items-center justify-center">Create Group Chat<FontAwesomeIcon className=" h-3 mx-2" icon={faPlus} /> </button>
                
                 <button onClick={() => chatrandom()} className=" w-full rounded-md px-4 py-4 text-white-300 bg-gradient-to-r from-cyan-500 to-blue-500 hover:bg-gradient-to-bl focus:outline-none focus:ring-2 focus:ring-gray-700 focus:ring-opacity-50 transition-all duration-200 flex flex-row items-center justify-center">Chat with stranger<FontAwesomeIcon className=" h-3 mx-2" icon={faUserSecret} /></button>
                 <button onClick={() => router.push('/pulse')} className=" w-full rounded-md px-4 py-4  text-white-300 bg-gradient-to-r from-cyan-500 to-blue-500 hover:bg-gradient-to-bl focus:outline-none focus:ring-2 focus:ring-gray-700 focus:ring-opacity-50 transition-all duration-200 flex flex-row items-center justify-center">Pulse (beta)<FontAwesomeIcon className=" h-3 mx-2" icon={faHeartbeat} /></button>

            </div>
            <div className="flex flex-col h-full mt-4 space-y-2">
                {rooms.map(room => {
                    return <div>
                        { room.name != "random" && <div key={room.id + " 2"} className="flex flex-row items-center gap-2 p-2 pr-4 rounded-md hover:bg-zinc-500/5 transition-all duration-200 cursor-pointer" onClick={() => JoinRoom(room)}>
                        <img src={`${mainConfig.initialsAPI +room?.name || mainConfig.initialsAPI + "NoName"}.png`} alt="username" className="w-10 h-10 rounded-md" />
                        <div className="flex-shrink-0 flex flex-col justify-center ">
                            <span className="font-semibold truncate">{room.name}</span>
                            {!room?.owner?.verified ? <span className="text-xs text-gray-400">Created by {room?.owner?.username.split(0, 5) + '...'}</span> : <span className="text-xs text-gray-400 flex flex-row items-center">Created by {room?.owner?.username.split(0, 5)} <FontAwesomeIcon className=" h-3 mx-2" icon={faCheckCircle} /></span> }
                        </div>
                        <span className="text-xs text-gray-400 bg-[#18191b] rounded-md p-1 absolute right-4 ">{room.users || 0}/{room.maxUsers}</span>
                        <div className="flex flex-col justify-end w-full items-center space-x-1">
                            {room.passwordProtected && <FontAwesomeIcon className=" h-4 mx-2" icon={faLock} />}
                        </div>
                    </div>}
                    </div>
                })}
            </div>

            <div className="flex flex-row items-center space-y-3 mt-6 w-full mb-20">
                <div className="flex flex-row items-center space-x-2 w-full hover:bg-zinc-500/5 p-4 rounded-lg transition-all duration-200">
                    {!user?.verified ? <span className="font-semibold">{user?.username}</span> : <span className="font-semibold flex -flex-row items-center">{user?.username} <FontAwesomeIcon className=" h-3 mx-2" icon={faCheckCircle} /></span> }
                </div>
                <a
                    href="/bug-report"
                    title="Report a bug"
                    className="hover:text-red-400 transition-colors duration-200"
                >
                    <FontAwesomeIcon icon={faBug} className="h-5 w-5 mr-5" />
                </a>
                
                <a
                    href="/suggest-feature"
                    title="Suggest a feature"
                    className="hover:text-yellow-300 transition-colors duration-200"
                >
                    <FontAwesomeIcon icon={faLightbulb} className="h-5 w-5 mr-5" />
                </a>

                <button
    onClick={() => signOut()}
    title="Log out"
    className="text-white hover:text-red-500 transition-colors duration-200"
  >
    <FontAwesomeIcon icon={faSignOut} className="h-5 w-5" />
  </button>
                 
            </div>
        </div>}
        </motion.div>}
    </>
}