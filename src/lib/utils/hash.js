import bcrypt from "bcryptjs";

export const hashData = async (plainValue) => {
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(plainValue, salt);
    if (hash) {
        return hash;
    }
    return false;
}

export const compareData = async (plainValue, hashValue) => {
    const isMatch = bcrypt.compareSync(plainValue, hashValue);
    return isMatch;
}