import { connectToDatabase } from "@/lib/db/mongoose";
import { getUserModel, IUser } from "@/lib/db/models/user.model";
import { NextRequest, NextResponse } from "next/server";
import bcryptjs from "bcryptjs";

export async function POST(request: NextRequest) {
  const requestBody = await request.json();
  const {
    firstName,
    lastName,
    otherNames,
    email,
    password,
    address,
    phoneNumber,
    cityOfResidence,
    stateOfResidence,
    postalCode,
  } = requestBody;

  try {
    connectToDatabase();
    // Check if the user already exist

    const User = await getUserModel();
    const userAlreadyExists = (await User.findOne({ email })) as IUser | null;
    if (userAlreadyExists) {
      return NextResponse.json(
        { error: "Email already exist" },
        { status: 401 }
      );
    }

    // Check if the user already exist
    const phoneNumberAlreadyExists = (await User.findOne({
      phoneNumber,
    })) as IUser | null;
    if (phoneNumberAlreadyExists) {
      return NextResponse.json(
        { error: "Phone Number already exist" },
        { status: 401 }
      );
    }

    // hash the password
    const salt = await bcryptjs.genSalt(10);
    const hashedPassword = await bcryptjs.hash(password, salt);

    // create a new user in the database
    const newUser = new User({
      firstName,
      lastName,
      otherNames,
      email,
      password: hashedPassword,
      address,
      phoneNumber,
      cityOfResidence,
      stateOfResidence,
      postalCode,
    });

    const savedUser = await newUser.save();

    return NextResponse.json(
      { message: `User created successfully`, success: true, savedUser },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
}
